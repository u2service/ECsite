from datetime import timedelta
from decimal import Decimal

from django.urls import reverse
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.middleware.csrf import _get_new_csrf_string, _mask_cipher_secret
from rest_framework import status
from rest_framework.test import APITestCase, APIClient
from rest_framework_simplejwt.tokens import AccessToken

from products.models import Category, Product, Cart

User = get_user_model()


class CookieJWTAuthenticationTestCase(APITestCase):
    """
    CookieJWTAuthentication の認証・セキュリティ検証:
    - Authorization ヘッダー経由での認証
    - HttpOnly Cookie 経由での認証
    - トークンの改ざん・有効期限切れ時の 401 判定
    - Cookie認証時の CSRF チェック（未送信・不正時は 403、正しい場合は通過）
    """
    def setUp(self):
        self.user = User.objects.create_user(
            username='auth_test_user',
            email='auth@example.com',
            password='password123'
        )
        self.category = Category.objects.create(name='テストカテゴリ')
        self.product = Product.objects.create(
            name='テスト商品',
            category=self.category,
            price=Decimal('1000.00'),
            stock=10
        )
        self.cart = Cart.objects.create(user=self.user)
        self.token = AccessToken.for_user(self.user)

    def test_authorization_header_authentication_success(self):
        """
        Authorization: Bearer <token> ヘッダーによる正常認証の検証
        """
        url = reverse('cart-list')
        response = self.client.get(
            url,
            HTTP_AUTHORIZATION=f'Bearer {str(self.token)}'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user'], self.user.id)

    def test_cookie_authentication_success_for_get_request(self):
        """
        Cookie (access_token) 経由による正常認証の検証 (GETリクエスト)
        """
        url = reverse('cart-list')
        self.client.cookies['access_token'] = str(self.token)
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user'], self.user.id)

    def test_tampered_token_returns_401(self):
        """
        改ざんされた不正なトークンでリクエストした際、401 Unauthorized が返るか検証
        """
        url = reverse('cart-list')
        # ヘッダー指定の場合
        res_header = self.client.get(url, HTTP_AUTHORIZATION='Bearer invalid.tampered.token')
        self.assertEqual(res_header.status_code, status.HTTP_401_UNAUTHORIZED)

        # Cookie指定の場合
        self.client.cookies['access_token'] = 'invalid.tampered.token'
        res_cookie = self.client.get(url)
        self.assertEqual(res_cookie.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_expired_token_returns_401(self):
        """
        有効期限切れのトークンでリクエストした際、401 Unauthorized が返るか検証
        """
        expired_token = AccessToken.for_user(self.user)
        # 過去の有効期限をセット
        expired_token.set_exp(lifetime=-timedelta(minutes=10))

        url = reverse('cart-list')
        self.client.cookies['access_token'] = str(expired_token)
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_cookie_auth_csrf_missing_returns_403_on_post(self):
        """
        CSRFチェック検証1:
        Cookie認証時、更新系（POST）リクエストで CSRF トークンが未送信の場合、
        enforce_csrf により 403 Forbidden で弾かれるか
        """
        # CSRFチェックを強制するクライアントを生成
        csrf_client = APIClient(enforce_csrf_checks=True)
        csrf_client.cookies['access_token'] = str(self.token)

        url = reverse('cart-add-item')
        # CSRFトークンを指定せずにPOST
        response = csrf_client.post(url, {'product_id': self.product.id, 'quantity': 1})

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('CSRF', str(response.data))

    def test_cookie_auth_csrf_invalid_returns_403_on_post(self):
        """
        CSRFチェック検証2:
        Cookie認証時、不正な CSRF トークンが送信された場合、
        403 Forbidden で弾かれるか
        """
        csrf_client = APIClient(enforce_csrf_checks=True)
        csrf_client.cookies['access_token'] = str(self.token)
        csrf_client.cookies['csrftoken'] = 'dummy_cookie_token'

        url = reverse('cart-add-item')
        # 一致しない不正なトークンヘッダーを送信
        response = csrf_client.post(
            url,
            {'product_id': self.product.id, 'quantity': 1},
            HTTP_X_CSRFTOKEN='invalid_token_header'
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cookie_auth_csrf_valid_allows_post(self):
        """
        CSRFチェック検証3:
        Cookie認証時、正しい CSRF トークン（Cookie & Header）が付与されていれば
        正常に POST リクエストが通過するか
        """
        csrf_client = APIClient(enforce_csrf_checks=True)
        csrf_client.cookies['access_token'] = str(self.token)

        # Django仕様の有効なCSRFトークンペアを生成
        raw_token = _get_new_csrf_string()
        masked_token = _mask_cipher_secret(raw_token)

        csrf_client.cookies['csrftoken'] = raw_token

        url = reverse('cart-add-item')
        response = csrf_client.post(
            url,
            {'product_id': self.product.id, 'quantity': 1},
            HTTP_X_CSRFTOKEN=masked_token
        )

        # 403エラーが回避され、カート追加が正常に完了すること
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['items']), 1)


class RateLimitingAPITestCase(APITestCase):
    """
    APIレート制限（Throttling）のテスト:
    CreateCheckoutSessionView (throttle_scope = 'burst', 10/minute)
    """
    def setUp(self):
        self.user = User.objects.create_user(
            username='throttle_user',
            email='throttle@example.com',
            password='password123'
        )
        # テスト間でレート制限のカウンターが干渉しないようキャッシュを初期化
        cache.clear()

    def tearDown(self):
        cache.clear()

    def test_burst_rate_limiting_exceeded(self):
        """
        短時間に連続してチェックアウトAPI（burst: 10/分）を呼び出した際、
        10回目までは許可され、11回目で 429 Too Many Requests が返るか検証
        """
        self.client.force_authenticate(user=self.user)
        url = reverse('create-checkout-session')

        # 1〜10回目: レート制限内（POST自体のバリデーション結果に関わらずレート制限はカウントされる）
        for i in range(10):
            response = self.client.post(url, {})
            self.assertNotEqual(
                response.status_code,
                status.HTTP_429_TOO_MANY_REQUESTS,
                f"{i + 1}回目のリクエストで意図せず429が発生しました"
            )

        # 11回目: レート制限超過により 429 Too Many Requests が返却されること
        exceeded_response = self.client.post(url, {})
        self.assertEqual(exceeded_response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)