from django.conf import settings
from rest_framework import exceptions
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.authentication import CSRFCheck
from drf_spectacular.extensions import OpenApiAuthenticationExtension

class CookieJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        # 1. ヘッダーからの取得を試みる（開発時や特定クライアント用）
        header = self.get_header(request)
        if header is not None:
            raw_token = self.get_raw_token(header)
        else:
            # 2. Cookieから取得
            cookie_name = settings.SIMPLE_JWT.get('AUTH_COOKIE', 'access_token')
            raw_token = request.COOKIES.get(cookie_name)
        # トークンがない場合は認証を行わない
        if raw_token is None:
            return None

        # 3. トークンの検証（不正な場合はここで例外が飛ぶ）
        try:
            validated_token = self.get_validated_token(raw_token)
        except Exception:
            # トークンが無効な場合は明示的に認証失敗を返す
            raise exceptions.AuthenticationFailed('Invalid token')

        # 4. Cookie使用時のみCSRFチェックを強制（非常に重要）
        if header is None:
            self.enforce_csrf(request)

        return self.get_user(validated_token), validated_token

    def enforce_csrf(self, request):
        """
        Cookie認証の場合、CSRFチェックを手動で実行する
        """
        check = CSRFCheck(get_response=lambda r: None)
        # 実際のリクエストオブジェクトを使用してチェック
        check.process_request(request)
        reason = check.process_view(request, None, (), {})
        if reason:
            # CSRF検証失敗
            raise exceptions.PermissionDenied(f'CSRF Failed: {reason}')
        
class CookieJWTAuthenticationScheme(OpenApiAuthenticationExtension):
    target_class = CookieJWTAuthentication
    name = 'CookieJWTAuth'  # 仕様書上で表示される識別名

    def get_security_definition(self, auto_schema):
        # Swagger UIの右上にある「Authorize」ボタンを押したときの挙動を設定
        return {
            'type': 'apiKey',
            'in': 'cookie',
            'name': 'access_token',  # あなたがCookieにセットしているJWTのキー名
        }
    