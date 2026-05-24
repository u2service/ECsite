from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('products.urls')), # API用のURLを追加

    # dj-rest-authのエンドポイント
    # ログイン、ログアウト、パスワードリセットなどの機能が含まれます
    path('api/auth/', include('dj_rest_auth.urls')),
    
    # ユーザー登録機能（dj-rest-auth.registration）
    path('api/auth/registration/', include('dj_rest_auth.registration.urls')),

    # これを追加！
    path(
        'password-reset/confirm/<str:uidb64>/<str:token>/',
        TemplateView.as_view(), # 実際にはフロントエンドのURLに飛ばすための目印
        name='password_reset_confirm'
    ),
]

# --- ▼ 開発環境でメディアファイルを配信するための設定を追加 ▼ ---
from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
# --- ▲ 開発環境でメディアファイルを配信するための設定を追加 ▲ ---


# django_ec_backend/backend/urls.py (または api/urls.py) の末尾に一時的に追記
from django.http import HttpResponse
from django.contrib.auth.models import User
from django.urls import path

def create_admin_temporary(request):
    # すでに同じ名前のユーザーがいないかチェック
    if not User.objects.filter(username="nottekekanri88").exists():
        User.objects.create_superuser(
            username="nottekekanri88",
            email="nottekesurf@gmail.com",
            password="1709p8TviNB6qjX8Arx_Iw"  # 👈 ここに本番用のパスワードを設定
        )
        return HttpResponse("本番環境のスーパーユーザーを作成しました！")
    return HttpResponse("そのユーザーは既に存在するか、作成済みです。")

# 既存の urlpatterns のリストの最後に、このルーティングを1行追加します
urlpatterns += [
    path('create-my-admin-secret-xyz/', create_admin_temporary),
]
