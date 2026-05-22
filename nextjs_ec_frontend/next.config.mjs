/** @type {import('next').NextConfig} */
const nextConfig = {
   images: {
    // 開発環境では画像の最適化（リサイズ等）を無効化する
    unoptimized: process.env.NODE_ENV === 'development',
     remotePatterns: [
       {
         protocol: 'http',
         hostname: 'localhost',
         port: '8000',
         pathname: '/media/**',
       },
       // 本番環境のURLがある場合はここに追加
     ],
   },

  // ▼ ここからリライトの設定を追記 ▼
  async rewrites() {
    // 本番環境（Vercel）では、環境変数からDjangoのURLを取得する。
    // 無い場合はローカル（http://127.0.0.1:8000）をデフォルトにする。
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

    return [
      {
        // フロント（3000番）への「/api/」から始まるリクエストを
        source: "/api/:path*",
        // 裏側でローカルのDjango（8000番）に転送する
        destination: `${backendUrl}/api/:path*`,
      },
      {
        // ▼ここが重要！管理画面へのリクエストもDjangoに転送する▼
        source: "/admin/:path*",
        destination: `${backendUrl}/admin/:path*`,
      },
    ];
  },
  // ▲ ここまで追記 ▲
};

export default nextConfig;
