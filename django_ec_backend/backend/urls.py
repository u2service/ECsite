# django_ec_backend/backend/urls.py
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

# from django.http import HttpResponse
# from django.contrib.auth.models import User
# from products import views as product_views  # productsのviewsをインポート

# 👇 1回だけ管理者を作るための一時的なプログラム
# def create_admin_temporary(request):
#     username = "nottekekanri88"  # 👈 ここを書き換える
#     password = "1709p8TviNB6qjX8Arx_Iw"  # 👈 ここを書き換える
#     email = "your_email@example.com"
    
#     if not User.objects.filter(username=username).exists():
#         User.objects.create_superuser(
#             username=username,
#             email=email,
#             password=password
#         )
#         return HttpResponse("本番環境のスーパーユーザーを作成しました！")
#     return HttpResponse("そのユーザーは既に存在するか、作成済みです。")

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
        'password-reset/confirm///',
        TemplateView.as_view(), # 実際にはフロントエンドのURLに飛ばすための目印
        name='password_reset_confirm'
    ),

    # ─── ★ここから drf-spectacular 用のURLを追加 ───
    # 1. APIのルールが詰まったデータ（スキーマ）を生成するURL
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    
    # 2. さっきアクセスした、Swagger UI（綺麗な取扱説明書）を表示するURL
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    
    urlpatterns += [
        path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
        path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    ]
    