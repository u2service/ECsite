/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  
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
       {
        protocol: 'https',
        hostname: 'e-csite-neon.vercel.app',
        pathname: '/media/**',
      },
     ],
  },

  // ▼ ここからリライトの設定を追記 ▼
  async rewrites() {
    // 開発環境（ローカル）のときだけ、後ろにいるDjango（8000番）に飛ばす
    if (process.env.NODE_ENV === 'development') {

      return [
        {
          source: "/api/:path*",
          destination: "http://127.0.0.1:8000/api/:path*",
        },
        {
          source: "/admin/:path*",
          destination: "http://127.0.0.1:8000/admin/:path*",
        },
      ];
    }
    
    // 本番環境（Vercel）では、vercel.jsonのルーティングが優先されるため、
    // Next.js側のリライトは空（何も転送しない）で正常に動作します。
    return [];
  },
};

export default nextConfig;
