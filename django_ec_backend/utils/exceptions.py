# backend/utils/exceptions.py
from rest_framework.views import exception_handler
from django.http import HttpResponseRedirect
from rest_framework import status

def custom_exception_handler(exc, context):
    # DRF標準の例外処理を呼び出してレスポンスを取得
    response = exception_handler(exc, context)
    request = context['request']

    # 認証エラー（401）または権限エラー（403）の場合
    if response is not None and response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]:
        
        # ブラウザからの直接アクセス（Acceptヘッダーに text/html が含まれる）かチェック
        accept_header = request.META.get('HTTP_ACCEPT', '')
        if 'text/html' in accept_header:
            # フロントエンド側の存在しないパスへリダイレクトして、Next.jsの404画面を出させる
            # (同一ドメイン運用なので相対パスの指定でOKです)
            return HttpResponseRedirect('/this-page-does-not-exist-api-404/')

    return response