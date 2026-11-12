import json
from decimal import Decimal
from datetime import timedelta
from unittest.mock import patch, MagicMock
import concurrent.futures

from django.urls import reverse
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db import connections
from rest_framework import status
from rest_framework.test import APITestCase, APIClient, APITransactionTestCase
import stripe

from products.models import (
    Category,
    Brand,
    Product,
    Cart,
    CartItem,
    Order,
    OrderItem,
    Postage,
)

User = get_user_model()


class CreateCheckoutSessionAPITestCase(APITestCase):
    """
    チェックアウトセッション作成（CreateCheckoutSessionView）のテスト:
    - カート空チェック
    - 都道府県バリデーション
    - 有効在庫（仮押さえ考慮）の不足時チェック
    - 既存の有効セッション再利用ロジック
    """
    def setUp(self):
        self.user = User.objects.create_user(
            username='buyer',
            email='buyer@example.com',
            password='password123'
        )
        self.other_user = User.objects.create_user(
            username='other',
            email='other@example.com',
            password='password123'
        )

        self.category = Category.objects.create(name='PC')
        self.brand = Brand.objects.create(name='BrandA')
        self.product = Product.objects.create(
            name='テストPC',
            category=self.category,
            brand=self.brand,
            price=Decimal('100000.00'),
            stock=10,  # 物理在庫 10
            shipping_size='60'
        )

        Postage.objects.create(prefecture='東京都', size='60', cost=Decimal('800'))

        self.cart = Cart.objects.create(user=self.user)
        self.url = reverse('create-checkout-session')

    def test_empty_cart_returns_400(self):
        """
        カートに商品が入っていない場合、400 Bad Request（カートが空です）を返すか検証
        """
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.url, {'prefecture': '東京都'})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('カートが空です', response.data.get('error', ''))

    def test_missing_prefecture_returns_400(self):
        """
        都道府県が指定されていない場合、400 Bad Request（都道府県を選択してください）を返すか検証
        """
        self.client.force_authenticate(user=self.user)
        CartItem.objects.create(cart=self.cart, product=self.product, quantity=1)

        response = self.client.post(self.url, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('都道府県を選択してください', response.data.get('error', ''))

    def test_insufficient_stock_considering_reservations(self):
        """
        仮押さえ分を考慮した有効在庫（available_stock）を超える数量を
        購入しようとした際に 400 Bad Request で拒否されるか検証
        """
        now = timezone.now()

        # 別のユーザーが既に 8点 を仮押さえ中（物理在庫10 - 仮押さえ8 = 有効在庫2）
        existing_order = Order.objects.create(
            user=self.other_user,
            total_amount=Decimal('800800.00'),
            status='pending_reservation',
            reserved_until=now + timedelta(minutes=20)
        )
        OrderItem.objects.create(order=existing_order, product=self.product, quantity=8, price=self.product.price)

        self.client.force_authenticate(user=self.user)
        # 有効在庫 2点 に対して 3点 購入しようとする
        CartItem.objects.create(cart=self.cart, product=self.product, quantity=3)

        response = self.client.post(self.url, {'prefecture': '東京都'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('在庫不足', response.data.get('error', ''))

    @patch('stripe.checkout.Session.create')
    @patch('stripe.checkout.Session.retrieve')
    def test_reuse_existing_valid_session(self, mock_retrieve, mock_create):
        """
        同一ユーザーが30分以内の有効な仮押さえを既に持っており、
        カート内容も同一の場合、Stripeセッションを新規作成せず既存のセッションを再利用するか検証
        """
        self.client.force_authenticate(user=self.user)
        CartItem.objects.create(cart=self.cart, product=self.product, quantity=1)

        # 既存の仮押さえ注文
        now = timezone.now()
        existing_order = Order.objects.create(
            user=self.user,
            total_amount=Decimal('100800.00'),
            shipping_cost=Decimal('800.00'),
            status='pending_reservation',
            reserved_until=now + timedelta(minutes=25),
            stripe_checkout_session_id='cs_test_existing_123'
        )
        OrderItem.objects.create(
            order=existing_order,
            product=self.product,
            quantity=1,
            price=self.product.price
        )

        # Stripe側の既存セッションが 'open' であるとモック
        mock_session = MagicMock()
        mock_session.id = 'cs_test_existing_123'
        mock_session.url = 'https://checkout.stripe.com/pay/cs_test_existing_123'
        mock_session.status = 'open'
        mock_retrieve.return_value = mock_session

        response = self.client.post(self.url, {'prefecture': '東京都'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        res_data = response.json()
        self.assertEqual(res_data['id'], 'cs_test_existing_123')
        self.assertEqual(res_data['url'], mock_session.url)

        # 既存セッションを再利用したため、Session.create は呼ばれていないこと
        mock_create.assert_not_called()
        mock_retrieve.assert_called_once_with('cs_test_existing_123')

class ConcurrencyStockContentionTestCase(APITransactionTestCase):
    """
    在庫の排他制御・競合テスト（TransactionTestCase を使用）:
    残り1点の在庫に対して2ユーザーが同時にチェックアウトした際、片方のみが成功することの検証
    """
    def setUp(self):
        self.user_a = User.objects.create_user(username='user_a', email='a@example.com', password='password123')
        self.user_b = User.objects.create_user(username='user_b', email='b@example.com', password='password123')

        self.category = Category.objects.create(name='限定品')
        self.product = Product.objects.create(
            name='限定1点スニーカー',
            category=self.category,
            price=Decimal('30000.00'),
            stock=1,  # 残り1点のみ
            shipping_size='60'
        )
        Postage.objects.create(prefecture='東京都', size='60', cost=Decimal('800'))

        # 両方のユーザーがカートに1点追加
        cart_a = Cart.objects.create(user=self.user_a)
        CartItem.objects.create(cart=cart_a, product=self.product, quantity=1)

        cart_b = Cart.objects.create(user=self.user_b)
        CartItem.objects.create(cart=cart_b, product=self.product, quantity=1)

        self.url = reverse('create-checkout-session')

    @patch('stripe.checkout.Session.create')
    def test_stock_contention_serial_execution(self, mock_create):
        """
        直列検証: ユーザーAが先に仮押さえに成功した後、
        ユーザーBが直後に同じ商品を決済しようとすると 400（在庫不足）で拒否されるか
        """
        mock_create.return_value = MagicMock(id='cs_session_a', url='https://checkout.stripe.com/a')

        client_a = APIClient()
        client_a.force_authenticate(user=self.user_a)
        res_a = client_a.post(self.url, {'prefecture': '東京都'})
        self.assertEqual(res_a.status_code, status.HTTP_200_OK)

        # ユーザーAが仮押さえしたため、有効在庫は 0
        self.assertEqual(self.product.available_stock, 0)

        # ユーザーBがリクエスト -> 在庫不足で400エラー
        client_b = APIClient()
        client_b.force_authenticate(user=self.user_b)
        res_b = client_b.post(self.url, {'prefecture': '東京都'})
        self.assertEqual(res_b.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('在庫不足', res_b.data.get('error', ''))

    @patch('stripe.checkout.Session.create')
    def test_concurrent_requests_only_one_succeeds(self, mock_create):
        """
        並行スレッド検証: 2人のユーザーが同時にリクエストを発行した際、
        1人のみが 200 OK、もう1人が 400 Bad Request になるか
        """
        mock_create.side_effect = lambda **kwargs: MagicMock(
            id=f"cs_{kwargs.get('metadata', {}).get('order_id', 'test')}",
            url='https://checkout.stripe.com/test'
        )

        def send_request(user):
            client = APIClient()
            client.force_authenticate(user=user)
            res = client.post(self.url, {'prefecture': '東京都'})
            # マルチスレッド環境でのコネクションリークを防ぐため閉じる
            connections.close_all()
            return res.status_code

        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            future_a = executor.submit(send_request, self.user_a)
            future_b = executor.submit(send_request, self.user_b)
            statuses = [future_a.result(), future_b.result()]

        # 片方だけが成功 (200) し、もう片方は在庫不足で拒否 (400) されること
        self.assertEqual(sorted(statuses), [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST])


class StripeWebhookAPITestCase(APITestCase):
    """
    Stripe Webhook（StripeWebhookView）のテスト:
    - 署名検証失敗時の 400 返却
    - checkout.session.completed による在庫減算・カートクリア・ステータス更新・メール通知
    - checkout.session.expired による注文失効・仮押さえ解除
    - 冪等性（同一Webhookの2重受信耐性）
    """
    def setUp(self):
        self.user = User.objects.create_user(
            username='webhook_user',
            email='webhook@example.com',
            password='password123'
        )
        self.category = Category.objects.create(name='テストカテゴリ')
        self.product = Product.objects.create(
            name='Webhook検証商品',
            category=self.category,
            price=Decimal('5000.00'),
            stock=10,  # 物理在庫 10
            shipping_size='60'
        )

        # ユーザーのカート（2個追加中）
        self.cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(cart=self.cart, product=self.product, quantity=2)

        # 仮押さえ注文（2個仮押さえ）
        now = timezone.now()
        self.order = Order.objects.create(
            user=self.user,
            total_amount=Decimal('10800.00'),
            shipping_cost=Decimal('800.00'),
            status='pending_reservation',
            reserved_until=now + timedelta(minutes=30),
            stripe_checkout_session_id='cs_webhook_test_123'
        )
        OrderItem.objects.create(
            order=self.order,
            product=self.product,
            quantity=2,
            price=self.product.price
        )

        self.url = reverse('stripe-webhook')

    @patch('stripe.Webhook.construct_event')
    def test_webhook_invalid_signature_returns_400(self, mock_construct_event):
        """
        不正な署名ヘッダーで SignatureVerificationError が発生した際に 400 を返すか検証
        """
        mock_construct_event.side_effect = stripe.error.SignatureVerificationError(
            message='Invalid signature', sig_header='bad_sig'
        )

        response = self.client.post(
            self.url,
            data=json.dumps({'type': 'checkout.session.completed'}),
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='bad_sig'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    @patch('products.views.checkout_views.send_order_confirmation_email')
    @patch('stripe.Webhook.construct_event')
    def test_webhook_checkout_session_completed(self, mock_construct_event, mock_send_email):
        """
        checkout.session.completed 受信時:
        1. 注文ステータスが 'paid' に更新される
        2. 物理在庫（stock）が注文数量分（2個）減算される (10 -> 8)
        3. カートの中身がクリアされる
        4. 注文確認メール関数が呼び出される
        """
        mock_session = MagicMock()
        mock_session.to_dict.return_value = {
            'id': 'cs_webhook_test_123',
            'customer_details': {
                'name': '山田 太郎',
                'email': 'buyer@example.com',
                'phone': '+819012345678',
                'address': {
                    'state': '東京都',
                    'city': '千代田区',
                    'line1': '1-1-1',
                    'line2': '',
                    'postal_code': '100-0001',
                    'country': 'JP'
                }
            }
        }
        mock_construct_event.return_value = {
            'type': 'checkout.session.completed',
            'data': {'object': mock_session}
        }

        response = self.client.post(
            self.url,
            data=json.dumps({'test': 'payload'}),
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='valid_sig'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # 1. 注文ステータスと顧客情報の更新確認
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, 'paid')
        self.assertEqual(self.order.full_name, '山田 太郎')

        # 2. 物理在庫が 10 から 8 に減算されていること
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 8)

        # 3. カートの中身が空になっていること
        self.cart.refresh_from_db()
        self.assertEqual(self.cart.items.count(), 0)

        # 4. メール送信関数が正しく呼ばれたこと
        mock_send_email.assert_called_once_with(self.order)

    @patch('stripe.Webhook.construct_event')
    def test_webhook_checkout_session_expired(self, mock_construct_event):
        """
        checkout.session.expired 受信時:
        1. 注文ステータスが 'expired' に更新される
        2. 有効在庫の計算から除外され、仮押さえが解除される
        """
        # 期限切れ前: 物理在庫10 - 仮押さえ2 = 有効在庫8
        self.assertEqual(self.product.available_stock, 8)

        mock_session = MagicMock()
        mock_session.to_dict.return_value = {'id': 'cs_webhook_test_123'}
        mock_construct_event.return_value = {
            'type': 'checkout.session.expired',
            'data': {'object': mock_session}
        }

        response = self.client.post(
            self.url,
            data=json.dumps({'test': 'payload'}),
            content_type='application/json',
            HTTP_STRIPE_SIGNATURE='valid_sig'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # 1. 注文ステータスが expired になっていること
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, 'expired')

        # 2. 仮押さえが外れ、有効在庫が 10 に戻ること
        self.assertEqual(self.product.available_stock, 10)

    @patch('products.views.checkout_views.send_order_confirmation_email')
    @patch('stripe.Webhook.construct_event')
    def test_webhook_idempotency_duplicate_event(self, mock_construct_event, mock_send_email):
        """
        冪等性テスト: Stripeから同一の completed Webhookが2回送信された場合、
        物理在庫の二重減算やステータスの不正更新が起きないか検証
        """
        mock_session = MagicMock()
        mock_session.to_dict.return_value = {
            'id': 'cs_webhook_test_123',
            'customer_details': {
                'name': '山田 太郎',
                'email': 'buyer@example.com',
                'phone': '+819012345678',
                'address': {'postal_code': '100-0001', 'country': 'JP'}
            }
        }
        mock_construct_event.return_value = {
            'type': 'checkout.session.completed',
            'data': {'object': mock_session}
        }

        # 1回目の受信（正常処理）
        res1 = self.client.post(self.url, data=json.dumps({}), content_type='application/json', HTTP_STRIPE_SIGNATURE='valid_sig')
        self.assertEqual(res1.status_code, status.HTTP_200_OK)

        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 8)
        self.assertEqual(mock_send_email.call_count, 1)

        # 2回目の受信（再送・重複イベント）
        res2 = self.client.post(self.url, data=json.dumps({}), content_type='application/json', HTTP_STRIPE_SIGNATURE='valid_sig')
        self.assertEqual(res2.status_code, status.HTTP_200_OK)

        # 在庫が二重減算（8 -> 6）されず、8 のまま維持されていること
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 8)

        # メールも2回目は送信されないこと
        self.assertEqual(mock_send_email.call_count, 1)