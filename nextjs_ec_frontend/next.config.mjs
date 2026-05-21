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
    return [
      {
        // フロント（3000番）への「/api/」から始まるリクエストを
        source: "/api/:path*",
        // 裏側でローカルのDjango（8000番）に転送する
        destination: "http://127.0.0.1:8000/api/:path*",
      },
    ];
  },
  // ▲ ここまで追記 ▲
};

export default nextConfig;
