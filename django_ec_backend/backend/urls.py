# django_ec_backend/backend/urls.py
from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse
from django.contrib.auth.models import User

# 👇 1回だけ管理者を作るための一時的なプログラム
def create_admin_temporary(request):
    username = "nottekekanri88"  # 👈 ここを書き換える
    password = "1709p8TviNB6qjX8Arx_Iw"  # 👈 ここを書き換える
    email = "your_email@example.com"
    
    if not User.objects.filter(username=username).exists():
        User.objects.create_superuser(
            username=username,
            email=email,
            password=password
        )
        return HttpResponse("本番環境のスーパーユーザーを作成しました！")
    return HttpResponse("そのユーザーは既に存在するか、作成済みです。")

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    
    # 🚨 👇 ここに直接追加します。Vercel経由で叩きやすいように、先頭に 'api/' を付けておくとより確実です
    path('api/create-my-admin-secret-xyz/', create_admin_temporary),
]
