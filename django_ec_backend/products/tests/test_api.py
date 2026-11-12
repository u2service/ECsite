from decimal import Decimal
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from products.models import (
    Category,
    Brand,
    Product,
    Cart,
    CartItem,
    Comment,
    CommentVote,
    Postage,
)

User = get_user_model()


class ProductAndCategoryAPITestCase(APITestCase):
    """
    商品・カテゴリ関連API（ProductViewSet, CategoryTreeView, ProductComparisonView）のテスト
    """
    def setUp(self):
        # カテゴリ階層構造の作成（家電 > PC > ノートPC）
        self.cat_root = Category.objects.create(name='家電')
        self.cat_pc = Category.objects.create(name='パソコン', parent=self.cat_root)
        self.cat_laptop = Category.objects.create(name='ノートPC', parent=self.cat_pc)
        self.cat_other = Category.objects.create(name='文房具')

        # ブランド
        self.brand_sony = Brand.objects.create(name='SONY')
        self.brand_apple = Brand.objects.create(name='Apple')

        # 商品作成
        self.prod_vaio = Product.objects.create(
            name='VAIO Pro 14',
            category=self.cat_laptop,
            brand=self.brand_sony,
            os='win',
            description='高性能なビジネス向けWindowsノートPC',
            price=Decimal('150000.00'),
            stock=10,
            specifications={'cpu': 'Core i7', 'memory': '16GB', 'storage': '512GB'}
        )
        self.prod_mac = Product.objects.create(
            name='MacBook Air M2',
            category=self.cat_laptop,
            brand=self.brand_apple,
            os='mac',
            description='薄型軽量なmacOSノートブック',
            price=Decimal('180000.00'),
            stock=5,
            specifications={'cpu': 'Apple M2', 'memory': '8GB', 'storage': '256GB'}
        )
        self.prod_pen = Product.objects.create(
            name='黒ボールペン',
            category=self.cat_other,
            price=Decimal('150.00'),
            stock=100,
            specifications={}
        )

    def test_category_tree_view(self):
        """
        CategoryTreeView: カテゴリ一覧が親子関係（ツリー構造）でネストされて返却されるか検証
        """
        url = reverse('category-tree-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # ルートカテゴリ（parent=None）のみがトップレベルに存在すること
        root_names = [item['name'] for item in response.data]
        self.assertIn('家電', root_names)
        self.assertIn('文房具', root_names)
        self.assertNotIn('パソコン', root_names)

        # 「家電」の子に「パソコン」、その子に「ノートPC」がネストされていること
        appliance_node = next(item for item in response.data if item['name'] == '家電')
        pc_node = appliance_node['children'][0]
        self.assertEqual(pc_node['name'], 'パソコン')
        laptop_node = pc_node['children'][0]
        self.assertEqual(laptop_node['name'], 'ノートPC')

    def test_product_list_filter_by_parent_category(self):
        """
        ProductViewSet: 親カテゴリ（例: 家電 / ID指定）で絞り込んだ際、
        その子孫カテゴリ（ノートPC）に属する商品も正しくヒットするか検証
        """
        url = reverse('product-list')
        response = self.client.get(url, {'category_id': self.cat_root.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results'] if 'results' in response.data else response.data
        result_ids = [p['id'] for p in results]

        self.assertIn(self.prod_vaio.id, result_ids)
        self.assertIn(self.prod_mac.id, result_ids)
        self.assertNotIn(self.prod_pen.id, result_ids)

    def test_product_list_filter_by_specifications(self):
        """
        ProductViewSet: 動的スペック（spec_* パラメータ）による絞り込みの検証
        """
        url = reverse('product-list')
        # spec_cpu=Apple M2 で絞り込み
        response = self.client.get(url, {'spec_cpu': 'Apple M2'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results'] if 'results' in response.data else response.data
        result_ids = [p['id'] for p in results]

        self.assertEqual(result_ids, [self.prod_mac.id])

    def test_product_list_keyword_search(self):
        """
        ProductViewSet: クエリパラメータ 'q' によるフリーワード検索（名前・説明文の部分一致）
        """
        url = reverse('product-list')
        # 説明文に含まれる 'Windows' で検索
        response = self.client.get(url, {'q': 'Windows'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results'] if 'results' in response.data else response.data
        result_ids = [p['id'] for p in results]

        self.assertEqual(result_ids, [self.prod_vaio.id])

    def test_product_comparison_view(self):
        """
        ProductComparisonView: 比較対象ID（カンマ区切り）を受け取り、
        動的スペックを含む商品情報が返却されるか検証
        """
        url = reverse('product-compare')
        ids_param = f"{self.prod_vaio.id},{self.prod_mac.id}"
        response = self.client.get(url, {'ids': ids_param})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

        vaio_data = next(p for p in response.data if p['id'] == self.prod_vaio.id)
        self.assertEqual(vaio_data['specifications']['cpu'], 'Core i7')
        self.assertEqual(vaio_data['specifications']['memory'], '16GB')

    def test_product_comparison_view_empty_or_invalid_param(self):
        """
        ProductComparisonView: 空のパラメータや不正な値の場合は空リストが返るか検証
        """
        url = reverse('product-compare')
        response_empty = self.client.get(url, {'ids': ''})
        self.assertEqual(response_empty.status_code, status.HTTP_200_OK)
        self.assertEqual(response_empty.data, [])

        response_invalid = self.client.get(url, {'ids': 'invalid,abc'})
        self.assertEqual(response_invalid.status_code, status.HTTP_200_OK)
        self.assertEqual(response_invalid.data, [])


class CartAPITestCase(APITestCase):
    """
    カート機能API（CartViewSet, CartItemViewSet）のテスト
    """
    def setUp(self):
        self.user1 = User.objects.create_user(username='user1', password='password123')
        self.user2 = User.objects.create_user(username='user2', password='password123')

        self.category = Category.objects.create(name='テストカテゴリ')
        self.prod_small = Product.objects.create(
            name='小型商品',
            category=self.category,
            price=Decimal('2000.00'),
            stock=10,
            shipping_size='60'  # 60サイズ
        )
        self.prod_large = Product.objects.create(
            name='大型商品',
            category=self.category,
            price=Decimal('10000.00'),
            stock=5,
            shipping_size='80'  # 80サイズ
        )

        # 送料マスタ設定（東京都）
        Postage.objects.create(prefecture='東京都', size='60', cost=Decimal('800'))
        Postage.objects.create(prefecture='東京都', size='80', cost=Decimal('1200'))

    def test_unauthenticated_access_blocked(self):
        """
        未ログイン時のカートアクセスが 401 Unauthorized となるか検証
        """
        url_cart = reverse('cart-list')
        res_cart = self.client.get(url_cart)
        self.assertEqual(res_cart.status_code, status.HTTP_401_UNAUTHORIZED)

        url_add = reverse('cart-add-item')
        res_add = self.client.post(url_add, {'product_id': self.prod_small.id, 'quantity': 1})
        self.assertEqual(res_add.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_cart_item_lifecycle(self):
        """
        カートへの商品追加、数量変更、削除の一連の動作を検証
        """
        self.client.force_authenticate(user=self.user1)

        # 1. カートに追加 (数量: 1)
        url_add = reverse('cart-add-item')
        res_add = self.client.post(url_add, {'product_id': self.prod_small.id, 'quantity': 1})
        self.assertEqual(res_add.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_add.data['items']), 1)
        item_id = res_add.data['items'][0]['id']
        self.assertEqual(res_add.data['items'][0]['quantity'], 1)

        # 2. 同一商品を再度追加 -> 数量が加算されること (1 + 2 = 3)
        res_add_again = self.client.post(url_add, {'product_id': self.prod_small.id, 'quantity': 2})
        self.assertEqual(res_add_again.status_code, status.HTTP_200_OK)
        self.assertEqual(res_add_again.data['items'][0]['quantity'], 3)

        # 3. CartItemViewSet による数量変更 (PATCH) -> 数量を 5 に更新
        url_item_detail = reverse('cart-items-detail', kwargs={'pk': item_id})
        res_patch = self.client.patch(url_item_detail, {'quantity': 5})
        self.assertEqual(res_patch.status_code, status.HTTP_200_OK)
        self.assertEqual(res_patch.data['quantity'], 5)

        # 4. カートから削除 (DELETE)
        res_delete = self.client.delete(url_item_detail)
        self.assertEqual(res_delete.status_code, status.HTTP_204_NO_CONTENT)

        # カートが空になっていることを確認
        res_cart = self.client.get(reverse('cart-list'))
        self.assertEqual(len(res_cart.data['items']), 0)

    def test_calculate_shipping_by_prefecture(self):
        """
        都道府県指定による送料計算: 各商品の配送サイズと数量をもとに
        正しく合算されるか検証 (60サイズ 800円×2個 + 80サイズ 1200円×1個 = 2800円)
        """
        self.client.force_authenticate(user=self.user1)

        # カートに商品を追加
        url_add = reverse('cart-add-item')
        self.client.post(url_add, {'product_id': self.prod_small.id, 'quantity': 2})
        self.client.post(url_add, {'product_id': self.prod_large.id, 'quantity': 1})

        # 東京都の送料計算をリクエスト
        url_shipping = reverse('cart-calculate-shipping')
        res_shipping = self.client.get(url_shipping, {'prefecture': '東京都'})

        self.assertEqual(res_shipping.status_code, status.HTTP_200_OK)
        # (800 * 2) + (1200 * 1) = 2800
        self.assertEqual(res_shipping.data['shipping_total'], 2800)

        # 未指定時は 0 円が返ること
        res_empty = self.client.get(url_shipping)
        self.assertEqual(res_empty.data['shipping_total'], 0)

    def test_cart_user_isolation(self):
        """
        他人のカートやカートアイテムを参照・変更・削除できないこと（ユーザー分離）の検証
        """
        # user1 でアイテムをカートに追加
        self.client.force_authenticate(user=self.user1)
        res_add = self.client.post(reverse('cart-add-item'), {'product_id': self.prod_small.id, 'quantity': 1})
        user1_item_id = res_add.data['items'][0]['id']

        # user2 でログインを切り替え
        self.client.force_authenticate(user=self.user2)

        # user2 のカート一覧には user1 の商品が含まれない
        res_cart2 = self.client.get(reverse('cart-list'))
        self.assertEqual(len(res_cart2.data['items']), 0)

        # user2 から user1 の CartItem に対して直接アクセスを試行 -> 404 Not Found
        url_item_detail = reverse('cart-items-detail', kwargs={'pk': user1_item_id})
        self.assertEqual(self.client.get(url_item_detail).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.patch(url_item_detail, {'quantity': 10}).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.delete(url_item_detail).status_code, status.HTTP_404_NOT_FOUND)


class CommentAPITestCase(APITestCase):
    """
    コメント機能API（CommentViewSet）のテスト
    """
    def setUp(self):
        self.user_author = User.objects.create_user(username='author', password='password123')
        self.user_voter1 = User.objects.create_user(username='voter1', password='password123')
        self.user_voter2 = User.objects.create_user(username='voter2', password='password123')

        self.category = Category.objects.create(name='PC')
        self.product = Product.objects.create(
            name='テストPC',
            category=self.category,
            price=Decimal('50000.00'),
            stock=10
        )

    def test_comment_create_and_list(self):
        """
        コメント投稿（要認証）と一覧取得（未認証でも可能）の検証
        """
        url_comments = reverse('comments-list')

        # 未ログインでの投稿は 401
        res_unauth = self.client.post(url_comments, {'product': self.product.id, 'content': '未ログイン投稿'})
        self.assertEqual(res_unauth.status_code, status.HTTP_401_UNAUTHORIZED)

        # ログインしてコメント投稿
        self.client.force_authenticate(user=self.user_author)
        res_create = self.client.post(url_comments, {
            'product': self.product.id,
            'content': '使いやすくて素晴らしい製品です！'
        })
        self.assertEqual(res_create.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res_create.data['content'], '使いやすくて素晴らしい製品です！')
        self.assertEqual(res_create.data['user_name'], 'author')

        # 未ログイン状態で商品ごとのコメント一覧を取得できること
        self.client.force_authenticate(user=None)
        res_list = self.client.get(url_comments, {'product_id': self.product.id})
        self.assertEqual(res_list.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_list.data), 1)

    def test_comment_voting_lifecycle(self):
        """
        Good / NG 投票の動作検証:
        - 新規投票（Good）
        - 投票内容の変更（Good -> NG）
        - 同一投票による重複防止（カウントが増加しないこと）
        - 複数ユーザーによる投票集計
        """
        comment = Comment.objects.create(
            product=self.product,
            user=self.user_author,
            content='レビューコメント'
        )
        url_vote = reverse('comments-vote', kwargs={'pk': comment.id})

        # 1. voter1 が 'good' に新規投票
        self.client.force_authenticate(user=self.user_voter1)
        res_good = self.client.post(url_vote, {'vote_type': 'good'})
        self.assertEqual(res_good.status_code, status.HTTP_200_OK)
        self.assertEqual(res_good.data['good_count'], 1)
        self.assertEqual(res_good.data['ng_count'], 0)
        self.assertEqual(res_good.data['current_user_vote'], 'good')

        # 2. voter1 が再度同じ 'good' 投票を送信（重複投票防止の確認: カウントは 1 のまま）
        res_repeat = self.client.post(url_vote, {'vote_type': 'good'})
        self.assertEqual(res_repeat.status_code, status.HTTP_200_OK)
        self.assertEqual(res_repeat.data['good_count'], 1)
        self.assertEqual(res_repeat.data['ng_count'], 0)
        self.assertEqual(CommentVote.objects.filter(comment=comment).count(), 1)

        # 3. voter1 が 'ng' に変更
        res_change = self.client.post(url_vote, {'vote_type': 'ng'})
        self.assertEqual(res_change.status_code, status.HTTP_200_OK)
        self.assertEqual(res_change.data['good_count'], 0)
        self.assertEqual(res_change.data['ng_count'], 1)
        self.assertEqual(res_change.data['current_user_vote'], 'ng')

        # 4. voter2 が 'good' に投票（異なるユーザーからの投票が合算されるか）
        self.client.force_authenticate(user=self.user_voter2)
        res_voter2 = self.client.post(url_vote, {'vote_type': 'good'})
        self.assertEqual(res_voter2.status_code, status.HTTP_200_OK)
        self.assertEqual(res_voter2.data['good_count'], 1)
        self.assertEqual(res_voter2.data['ng_count'], 1)
        self.assertEqual(res_voter2.data['current_user_vote'], 'good')