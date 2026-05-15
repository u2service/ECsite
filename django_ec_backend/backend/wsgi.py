"""
WSGI config for backend project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

application = get_wsgi_application()

# ---- ここから追加：自動管理者作成の裏技 ----
try:
    from django.contrib.auth import get_user_model
    User = get_user_model()
    # ユーザー名 'admin' が存在しない場合だけ作成する
    if not User.objects.filter(username='admin').exists():
        User.objects.create_superuser(
            username='nottekekanri88',
            email='nottekesurf@gmail.com',
            password='1709p8TviNB6qjX8Arx_Iw'  # 👈 自分の好きなパスワードに変えてください！
        )
        print("=== Superuser 'admin' created successfully! ===")
except Exception as e:
    print(f"=== Superuser creation failed: {e} ===")
# ---- ここまで追加 ----