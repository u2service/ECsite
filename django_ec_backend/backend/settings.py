import os
from pathlib import Path
from dotenv import load_dotenv
import dj_database_url

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# .envファイルを読み込む
load_dotenv(os.path.join(BASE_DIR, '.env'))

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/6.0/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
# DEBUG=True（開発環境）のときだけ、お試しの鍵を使う
if os.getenv('DEBUG') == 'True':
    SECRET_KEY = os.getenv("SECRET_KEY", "django-insecure-default-key-for-dev")
else:
    # 本番環境（DEBUG=False）では、値がないと KeyError でクラッシュさせる
    SECRET_KEY = os.environ["SECRET_KEY"]
STRIPE_SECRET_KEY = os.getenv('STRIPE_SECRET_KEY')
STRIPE_PUBLISHABLE_KEY = os.getenv('STRIPE_PUBLISHABLE_KEY')
STRIPE_WEBHOOK_SECRET = os.getenv('STRIPE_WEBHOOK_SECRET')

# SECURITY WARNING: don't run with debug turned on in production!
# 本番環境ではデバッグをオンにした状態で実行しないでください。
DEBUG = os.getenv('DEBUG', 'False') == 'True'

ALLOWED_HOSTS_str = os.getenv('ALLOWED_HOSTS', '127.0.0.1,localhost')
ALLOWED_HOSTS = [h.strip() for h in ALLOWED_HOSTS_str.split(',')] if ALLOWED_HOSTS_str else []

# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sites',
    'corsheaders',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'dj_rest_auth',
    'dj_rest_auth.registration',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'mptt',
    'products',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'allauth.account.middleware.AccountMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# プロキシ（Nginx/Cloudflare等）経由でのHTTPS通信を正しく判定するために必要
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend.wsgi.application'


# Database
# https://docs.djangoproject.com/en/6.0/ref/settings/#databases

#  Vercel環境（DATABASE_URL）と個別設定の両方に対応する本番仕様
if os.environ.get('DATABASE_URL'):
    # Neonの1本にまとまったURLがある場合は、dj-database-urlが自動でパース（解析）して接続します
    DATABASES = {
        'default': dj_database_url.config(
            default=os.environ.get('DATABASE_URL'),
            conn_max_age=600,
            ssl_require=True  #  Neon(クラウド)への接続には暗号化(SSL)が必須なため安全策として追加
        )
    }
else:
    # ローカル環境など、個別の環境変数がある場合はこちらで接続します
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ.get('DB_NAME'),
            'USER': os.environ.get('DB_USER'),
            'PASSWORD': os.environ.get('DB_PASSWORD'),
            'HOST': os.environ.get('DB_HOST'),
            'PORT': os.environ.get('DB_PORT'),
        }
    }

# Render（本番環境）の環境変数 DATABASE_URL が存在する場合のみ、設定をPostgreSQLで上書きする
DATABASE_URL = os.environ.get('DATABASE_URL')
if DATABASE_URL:
    DATABASES['default'] = dj_database_url.config(
        default=DATABASE_URL,
        conn_max_age=600,
        ssl_require=True
    )

# Password validation
# https://docs.djangoproject.com/en/6.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/6.0/topics/i18n/

LANGUAGE_CODE = 'ja'

TIME_ZONE = 'Asia/Tokyo'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/6.0/howto/static-files/

STATIC_URL = 'static/'
# これを追加！ (プロジェクトのルート直下の 'staticfiles' というフォルダに集める設定)
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# すでにある場合はそのままでOK
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'static'),
]

# ファイルの末尾に、以下の設定を追記
# CORS_ALLOWED_ORIGINS = [
#     'http://localhost:3000',
#     'http://127.0.0.1:3000', # 追加
# ]

# 1. コードに直接書く許可URL（ローカル開発用や特定の固定URL）
CORS_ALLOWED_ORIGINS = [
    "https://e-csite-neon.vercel.app",
    'http://localhost:3000',
    'http://127.0.0.1:3000',
]

# 2. 環境変数からURLを読み込む
raw_origins = os.getenv("CORS_ALLOWED_ORIGINS", "")
if raw_origins:
    env_origins = [origin.strip() for origin in raw_origins.split(",") if origin]
    # 3. 直接書いたリストに、環境変数のリストを追加（結合）する
    CORS_ALLOWED_ORIGINS.extend(env_origins)
    
# 3. CSRFの信頼済みオリジンを設定（CORSのリストをそのままコピーする）
# ※中身がすべて「http://」か「https://」で始まっている必要があります
CSRF_TRUSTED_ORIGINS = [origin for origin in CORS_ALLOWED_ORIGINS]

# --- ▼ 画像アップロードのための設定を追加 ▼ ---
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# --- ▼ 認証関連の設定を追加 ▼ ---
  
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'backend.authentication.CookieJWTAuthentication', # 作成したクラスを指定
    ),
    # ▼ ここから追記 ▼
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',   # 未ログインユーザー用
        'rest_framework.throttling.UserRateThrottle',   # ログイン済みユーザー用
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/day',      # 未ログイン：1日100リクエストまで（厳しめ）
        'user': '1000/day',     # ログイン済：1日1000リクエストまで
        'burst': '10/minute',   # 短時間の連打対策（個別に適用）
        'sensitive': '5/minute',# ログインなど機密性の高い操作用
    }
    # ▲ ここまで追記 ▲
}
  
# dj-rest-authでJWTを使用するための設定
REST_AUTH = {
  'USE_JWT': True,
  'JWT_AUTH_HTTPONLY': True,  # セキュリティ強化のためTrueに変更
  'JWT_AUTH_COOKIE': 'access_token',  # SIMPLE_JWT['AUTH_COOKIE'] と合わせる
  'JWT_AUTH_REFRESH_COOKIE': 'refresh_token',
  'JWT_AUTH_COOKIE_USE_CSRF': True, # CSRF対策を有効にする
  'REGISTER_SERIALIZER': 'products.serializers.CustomRegisterSerializer',

  # ▼▼ ここから重要：この2行を追記します ▼▼
  'SESSION_LOGIN': False,  # サーバーレス運用なのでセッションログインを無効化
  'TOKEN_MODEL': None,     # authtokenアプリ（DBトークン）を使わないように指定
  # ▲▲ ここまで追記 ▲▲

  # ▼ パスワードリセットメールのURLをフロントエンドのパスに設定 ▼
  'PASSWORD_RESET_CONFIRM_URL': 'password-reset-confirm/{uid}/{token}',

  # ▼ パスワード変更時に古いパスワードを要求する設定（セキュリティ向上）▼
  'OLD_PASSWORD_FIELD_ENABLED': True,
  # ▼ パスワード変更後に自動でログアウトさせる設定（セキュリティ向上）▼
  'LOGOUT_ON_PASSWORD_CHANGE': True,
}

# 1. サイト識別用ID（通常は 1 でOK）
# allauthとdj-rest-authで必須
SITE_ID = 1

# 2. 認証方法の設定
ACCOUNT_LOGIN_METHODS = {'email'}
ACCOUNT_SIGNUP_FIELDS = ['email*', 'username*', 'password1*', 'password2*']

# 3. メール検証の設定（開発中は重要！）
# 'mandatory' にするとメール確認が取れるまでログインできなくなります。
# 開発中は 'none'（検証なし）に設定して、登録後すぐ使えるようにするのがスムーズです。
ACCOUNT_EMAIL_VERIFICATION = 'none'

# 4. ユーザー名の重複を許さない
ACCOUNT_UNIQUE_EMAIL = True

# 5. ログイン・ログアウト後のリダイレクト先（API利用時は基本的には無視されますが念のため）
# LOGIN_REDIRECT_URL = '/'
# LOGOUT_REDIRECT_URL = '/'

AUTHENTICATION_BACKENDS = [
    # これが email 認証に必要です
    'django.contrib.auth.backends.ModelBackend',
    'allauth.account.auth_backends.AuthenticationBackend',
]

from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),  # 短命なアクセストークン
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),    # 長命なリフレッシュトークン
    'ROTATE_REFRESH_TOKENS': True,                 # リフレッシュ時に新しいリフレッシュトークンを発行
    'BLACKLIST_AFTER_ROTATION': True,               # 使用済みトークンをブラックリストへ
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_COOKIE': 'access_token',
    'AUTH_COOKIE_DOMAIN': None,        # 同一ドメインならNoneでOK
    'AUTH_COOKIE_HTTP_ONLY': True,
    'AUTH_COOKIE_PATH': '/',           # サイト全体で有効
    'AUTH_COOKIE_SECURE': not DEBUG, # この書き方は、「開発中（DEBUG=True）」と「本番公開（DEBUG=False）」で自動的に設定を切り替える
    'AUTH_COOKIE_SAMESITE': 'Lax',
}

# Cookieをフロントエンドとバックエンド間でやり取りする場合、以下の設定がないとブラウザがセキュリティ制限でリクエストをブロックします。
CORS_ALLOW_CREDENTIALS = True

# --- ▲ 認証関連の設定を追加 ▲ ---

# デフォルトのオートフィールド型を指定
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'



# --- ▼ パスワードリセット用のメール設定 (開発用) ▼ ---
if DEBUG:
    # 実際には送らず、ターミナルにメール内容を表示する設定
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
else:
    # 本番環境の設定（SendGrid, Gmail SMTP など）
    # EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    # EMAIL_HOST = 'smtp.gmail.com'
    # EMAIL_PORT = 587
    # EMAIL_USE_TLS = True
    # EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
    # EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')
    # DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'noreply@example.com')
    ...
# --- ▲ パスワードリセット用のメール設定 (開発用) ▲ ---

