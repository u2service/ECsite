# django_ec_backend/backend/urls.py
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

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
    