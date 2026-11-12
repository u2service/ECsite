from datetime import timedelta
from decimal import Decimal
from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db.utils import IntegrityError

from products.models import (
    Category,
    Brand,
    Product,
    Cart,
    CartItem,
    Order,
    OrderItem,
    Comment,
    CommentVote,
    Postage,
)

User = get_user_model()


class ProductAvailableStockTestCase(TestCase):
    """
    Productモデルの有効在庫（available_stock）計算ロジックの検証
    """
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='password123'
        )
        self.category = Category.objects.create(name='PC・家電')
        self.brand = Brand.objects.create(name='TestBrand')
        self.product = Product.objects.create(
            name='テストノートPC',
            category=self.category,
            brand=self.brand,
            price=Decimal('100000.00'),
            stock=10,  # 物理在庫 10
            shipping_size='80'
        )

    def test_available_stock_deducts_active_reservations(self):
        """
        物理在庫から有効な仮押さえ（reserved_until > now かつ status='pending_reservation'）の
        数量が正しく差し引かれているか検証
        """
        now = timezone.now()

        # 有効期限内の仮押さえ注文1 (数量: 2)
        order1 = Order.objects.create(
            user=self.user,
            full_name='ユーザー1',
            email='user1@example.com',
            shipping_address='東京都千代田区1-1',
            total_amount=Decimal('200000.00'),
            status='pending_reservation',
            reserved_until=now + timedelta(minutes=15)
        )
        OrderItem.objects.create(order=order1, product=self.product, quantity=2, price=Decimal('100000.00'))

        # 有効期限内の仮押さえ注文2 (数量: 3)
        order2 = Order.objects.create(
            user=self.user,
            full_name='ユーザー2',
            email='user2@example.com',
            shipping_address='東京都千代田区1-2',
            total_amount=Decimal('300000.00'),
            status='pending_reservation',
            reserved_until=now + timedelta(minutes=25)
        )
        OrderItem.objects.create(order=order2, product=self.product, quantity=3, price=Decimal('100000.00'))

        # 物理在庫 10 - 仮押さえ (2 + 3) = 有効在庫 5
        self.assertEqual(self.product.available_stock, 5)

    def test_available_stock_excludes_expired_reservations(self):
        """
        有効期限切れ（reserved_until <= now）の仮押さえが有効在庫の計算から除外されているか検証
        """
        now = timezone.now()

        # 期限切れの仮押さえ (数量: 4)
        expired_order = Order.objects.create(
            user=self.user,
            full_name='期限切れユーザー',
            email='expired@example.com',
            shipping_address='東京都千代田区1-3',
            total_amount=Decimal('400000.00'),
            status='pending_reservation',
            reserved_until=now - timedelta(minutes=1)
        )
        OrderItem.objects.create(order=expired_order, product=self.product, quantity=4, price=Decimal('100000.00'))

        # 有効期限内の仮押さえ (数量: 2)
        active_order = Order.objects.create(
            user=self.user,
            full_name='有効ユーザー',
            email='active@example.com',
            shipping_address='東京都千代田区1-4',
            total_amount=Decimal('200000.00'),
            status='pending_reservation',
            reserved_until=now + timedelta(minutes=20)
        )
        OrderItem.objects.create(order=active_order, product=self.product, quantity=2, price=Decimal('100000.00'))

        # 期限切れ分(4)は無視され、有効な仮押さえ分(2)のみ差し引かれる (10 - 2 = 8)
        self.assertEqual(self.product.available_stock, 8)

    def test_available_stock_excludes_non_pending_reservation_statuses(self):
        """
        status が 'pending_reservation' 以外の注文は、reserved_until が未来であっても
        仮押さえ計算から除外されるか検証（購入完了 paid、失効 expired、キャンセル cancelled など）
        """
        now = timezone.now()

        order_paid = Order.objects.create(
            user=self.user,
            full_name='支払い済みユーザー',
            email='paid@example.com',
            shipping_address='東京都千代田区1-5',
            total_amount=Decimal('100000.00'),
            status='paid',
            reserved_until=now + timedelta(minutes=10)
        )
        OrderItem.objects.create(order=order_paid, product=self.product, quantity=3, price=Decimal('100000.00'))

        # pending_reservation ではないため、有効在庫は 10 のまま
        self.assertEqual(self.product.available_stock, 10)

    def test_available_stock_stops_at_zero_when_oversubscribed(self):
        """
        仮押さえ数が物理在庫を上回った場合に、負の値にならず 0 でストップするか検証
        """
        now = timezone.now()

        # 物理在庫 10 に対し、15 個の仮押さえ
        excess_order = Order.objects.create(
            user=self.user,
            full_name='超過ユーザー',
            email='excess@example.com',
            shipping_address='東京都千代田区1-6',
            total_amount=Decimal('1500000.00'),
            status='pending_reservation',
            reserved_until=now + timedelta(minutes=30)
        )
        OrderItem.objects.create(order=excess_order, product=self.product, quantity=15, price=Decimal('100000.00'))

        # 10 - 15 = -5 ではなく max(0, -5) = 0
        self.assertEqual(self.product.available_stock, 0)


class CategoryMPTTTestCase(TestCase):
    """
    MPTTカテゴリモデルの階層構造、ツリー順序、ユニーク制約の検証
    """
    def test_category_hierarchy_and_tree_structure(self):
        """
        親子・子孫関係の階層構造が正常に構築・取得できるか検証
        """
        root = Category.objects.create(name='家電')
        child = Category.objects.create(name='パソコン', parent=root)
        grandchild = Category.objects.create(name='ノートPC', parent=child)

        self.assertIn(child, root.children.all())
        self.assertEqual(child.parent, root)
        self.assertIn(grandchild, child.get_descendants())
        self.assertIn(root, grandchild.get_ancestors())

    def test_category_tree_ordering_by_name(self):
        """
        MPTTMeta (order_insertion_by = ['name']) に基づき、
        同階層で名前順にツリーが整列されているか検証
        """
        parent = Category.objects.create(name='PC周辺機器')
        # 意図的に逆順で作成
        Category.objects.create(name='マウス', parent=parent)
        Category.objects.create(name='キーボード', parent=parent)
        Category.objects.create(name='ディスプレイ', parent=parent)

        child_names = list(parent.get_children().values_list('name', flat=True))
        # 挿入順に関わらず name 順（昇順）に並んでいることを検証
        self.assertEqual(child_names, ['キーボード', 'ディスプレイ', 'マウス'])

    def test_category_unique_together_same_parent(self):
        """
        同階層（同一 parent）で同一名のカテゴリを作成しようとした際に
        IntegrityError が発生するか検証
        """
        parent = Category.objects.create(name='生活家電')
        Category.objects.create(name='冷蔵庫', parent=parent)

        with self.assertRaises(IntegrityError):
            Category.objects.create(name='冷蔵庫', parent=parent)

    def test_category_allow_same_name_different_parent(self):
        """
        異なる親カテゴリ配下であれば同名のカテゴリが作成可能であることの検証
        """
        parent1 = Category.objects.create(name='生活家電')
        parent2 = Category.objects.create(name='オフィス用品')

        cat1 = Category.objects.create(name='消耗品', parent=parent1)
        cat2 = Category.objects.create(name='消耗品', parent=parent2)

        self.assertIsNotNone(cat1.id)
        self.assertIsNotNone(cat2.id)


class CartModelTestCase(TestCase):
    """
    Cart / CartItem モデルの制約検証
    """
    def setUp(self):
        self.user = User.objects.create_user(username='cartuser', password='password123')
        self.category = Category.objects.create(name='雑貨')
        self.product = Product.objects.create(
            name='商品A',
            category=self.category,
            price=Decimal('1000.00'),
            stock=10
        )
        self.cart = Cart.objects.create(user=self.user)

    def test_cart_item_unique_together_constraint(self):
        """
        同一カート内で同一商品を追加した際にユニーク制約（unique_together = ('cart', 'product')）
        により IntegrityError が発生するか検証
        """
        CartItem.objects.create(cart=self.cart, product=self.product, quantity=1)

        with self.assertRaises(IntegrityError):
            CartItem.objects.create(cart=self.cart, product=self.product, quantity=2)


class CommentVoteModelTestCase(TestCase):
    """
    CommentVote モデルの制約検証
    """
    def setUp(self):
        self.user = User.objects.create_user(username='voter', password='password123')
        self.category = Category.objects.create(name='本')
        self.product = Product.objects.create(
            name='書籍B',
            category=self.category,
            price=Decimal('1500.00'),
            stock=5
        )
        self.comment = Comment.objects.create(
            product=self.product,
            user=self.user,
            content='おすすめの商品です。'
        )

    def test_comment_vote_unique_together_constraint(self):
        """
        同一ユーザーが同一コメントに対して重複投票できない制約（unique_together = ('comment', 'user')）
        により IntegrityError が発生するか検証
        """
        CommentVote.objects.create(comment=self.comment, user=self.user, vote_type='good')

        # 同一ユーザー・同一コメントへの2回目の投票（NG投票への変更や重複投票の防止）
        with self.assertRaises(IntegrityError):
            CommentVote.objects.create(comment=self.comment, user=self.user, vote_type='ng')


class PostageModelTestCase(TestCase):
    """
    Postage モデルのユニーク制約および送料取得ロジックの検証
    """
    def test_postage_unique_together_constraint(self):
        """
        都道府県×荷物サイズごとのユニーク制約（unique_together = ('prefecture', 'size')）
        により、同一の組み合わせで重複登録しようとすると IntegrityError が発生するか検証
        """
        Postage.objects.create(prefecture='東京都', size='60', cost=Decimal('800'))

        with self.assertRaises(IntegrityError):
            Postage.objects.create(prefecture='東京都', size='60', cost=Decimal('900'))

    def test_postage_cost_lookup(self):
        """
        都道府県と荷物サイズの組み合わせから正しい送料を取得できるか検証
        """
        Postage.objects.create(prefecture='東京都', size='60', cost=Decimal('800'))
        Postage.objects.create(prefecture='東京都', size='80', cost=Decimal('1000'))
        Postage.objects.create(prefecture='大阪府', size='60', cost=Decimal('900'))

        tokyo_80 = Postage.objects.get(prefecture='東京都', size='80')
        osaka_60 = Postage.objects.get(prefecture='大阪府', size='60')

        self.assertEqual(tokyo_80.cost, Decimal('1000'))
        self.assertEqual(osaka_60.cost, Decimal('900'))
