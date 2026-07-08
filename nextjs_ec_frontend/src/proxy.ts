import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 💡 ログイン必須にしたいページ（認証ガードの対象パス）
export const config = {
  matcher: [
    '/cart/:path*',
    '/checkout/:path*',
    '/orders/:path*',
    '/success/:path*',
    '/cancel/:path*',
  ],
}

export function proxy(request: NextRequest) {
  // ─── ▼ 追加：例外ルート（ログイン不要）の判定 ▼ ───
  // 現在アクセスしようとしているパスが `/checkout/cancel` の場合は、
  // トークンの有無に関わらず、即座にスルー（NextResponse.next）させます。
  if (request.nextUrl.pathname === '/checkout/cancel') {
    return NextResponse.next()
  }
  // ─── ▲ ここまで ▲ ───

  // 💡 クッキーの中から 'access_token' を取得します
  const accessToken = request.cookies.get('access_token')?.value

  // アクセストークンがなければ、フロントの画面（HTML/JS）を描画する前に即座に弾く
  if (!accessToken) {
    // ログイン画面へリダイレクト
    const loginUrl = new URL('/login', request.url)
    
    // （オプション）ログイン後に元のページに戻れるよう、現在アクセスしようとしたURLを覚えておく設定
    loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname)
    
    return NextResponse.redirect(loginUrl)
  }

  // トークンがあればそのままページを表示する
  return NextResponse.next()
}