import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 💡 認証ガード、およびAPIアクセス監視の対象パス
export const config = {
  matcher: [
    '/api/:path*',      // ✨【追加】フロントエンド側の /api/... への直接アクセスを監視
    '/cart/:path*',
    '/checkout/:path*',
    '/orders/:path*',
    '/success/:path*',
    '/cancel/:path*',
  ],
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ─── ▼ ✨【追加】間違ったAPI直接アクセスへの防御壁 ▼ ───
  // ユーザーがブラウザ等から直接フロントエンド（3000番）の /api/... にアクセスした場合
  if (pathname.startsWith('/api')) {
    // 認証チェックやリダイレクトを一切走らせず、即座にNext.js標準の404画面にリライトして遮断
    return NextResponse.rewrite(new URL('/_not-found', request.url))
  }
  // ─── ▲ ここまで ▲ ───


  // ─── ▼ 例外ルート（ログイン不要）の判定 ▼ ───
  // 現在アクセスしようとしているパスが `/checkout/cancel` の場合は、
  // トークンの有無に関わらず、即座にスルー（NextResponse.next）させます。
  if (pathname === '/checkout/cancel') {
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
    loginUrl.searchParams.set('callbackUrl', pathname)
    
    return NextResponse.redirect(loginUrl)
  }

  // トークンがあればそのままページを表示する
  return NextResponse.next()
}