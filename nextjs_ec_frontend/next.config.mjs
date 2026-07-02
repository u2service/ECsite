/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  
  images: {
    unoptimized: process.env.NODE_ENV === 'development',
     remotePatterns: [
       {
         protocol: 'http',
         hostname: 'localhost',
         port: '8000',
         pathname: '/media/**',
       },
       {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
     ],
  },

  // ▼ 本番環境の通信先を wsgi.py 直接指定から正しいパス構成に変更 ▼
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
        {
          source: "/media/:path*",
          destination: "http://127.0.0.1:8000/media/:path*",
        },
      ];
    }
    
    // 【B】本番環境（Vercel）のとき
    // wsgi.py というファイル名を含めず、プロジェクトルートからのフォルダ構造でリライトします。
    return [
      {
        source: "/api/:path*",
        destination: "https://e-csite-neon.vercel.app/django_ec_backend/api/:path*",
      },
      {
        source: "/admin/:path*",
        destination: "https://e-csite-neon.vercel.app/django_ec_backend/admin/:path*",
      },
      {
        source: "/static/:path*",
        destination: "https://e-csite-neon.vercel.app/django_ec_backend/static/:path*",
      },
      {
        source: "/media/:path*",
        destination: "https://e-csite-neon.vercel.app/django_ec_backend/media/:path*",
      },
    ];
  },
};

export default nextConfig;