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

  // ▼ Next.jsの横取りを回避し、Vercel内部のDjango関数へ直接プロキシする ▼
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
    // VercelがビルドしたDjangoのServerless Functionの内部ルートを直撃させます。
    return [
      {
        source: "/api/:path*",
        destination: "https://e-csite-neon.vercel.app/api/django_ec_backend/backend/wsgi.py/:path*",
      },
      {
        source: "/admin/:path*",
        destination: "https://e-csite-neon.vercel.app/api/django_ec_backend/backend/wsgi.py/:path*",
      },
      {
        source: "/static/:path*",
        destination: "https://e-csite-neon.vercel.app/api/django_ec_backend/backend/wsgi.py/:path*",
      },
      {
        source: "/media/:path*",
        destination: "https://e-csite-neon.vercel.app/api/django_ec_backend/backend/wsgi.py/:path*",
      },
    ];
  },
};

export default nextConfig;