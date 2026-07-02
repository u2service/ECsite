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
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
     ],
  },

  // ▼ リライトの設定を環境（開発・本番）に合わせて自動切り替え ▼
  async rewrites() {
    // 【A】開発環境（ローカル）のとき
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
        // メディアファイルの転送設定
        {
          source: "/media/:path*",
          destination: "http://127.0.0.1:8000/media/:path*",
        },
      ];
    }
    
    // 【B】本番環境（Vercel）のとき
    // Vercelが外側のルーティングを無視する仕様に対応するため、Next.js自身がDjango（wsgi.py）へ中継します。
    return [
      {
        source: "/api/:path*",
        destination: "https://e-csite-neon.vercel.app/django_ec_backend/backend/wsgi.py/api/:path*",
      },
      {
        source: "/admin/:path*",
        destination: "https://e-csite-neon.vercel.app/django_ec_backend/backend/wsgi.py/admin/:path*",
      },
      {
        source: "/static/:path*",
        destination: "https://e-csite-neon.vercel.app/django_ec_backend/backend/wsgi.py/static/:path*",
      },
      {
        source: "/media/:path*",
        destination: "https://e-csite-neon.vercel.app/django_ec_backend/media/:path*",
      },
    ];
  },
};

export default nextConfig;