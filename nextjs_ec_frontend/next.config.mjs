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
    // ドメイン名を排除し、Vercelがビルドした実際のDjango配置パスへ直接マッピングします。
    // これにより、Next.js自体の無限ループ条件から脱出させます。
    return [
      {
        source: "/api/:path*",
        destination: "/django_ec_backend/backend/wsgi.py/api/:path*",
      },
      {
        source: "/admin/:path*",
        destination: "/django_ec_backend/backend/wsgi.py/admin/:path*",
      },
      {
        source: "/static/:path*",
        destination: "/django_ec_backend/backend/wsgi.py/static/:path*",
      },
      {
        source: "/media/:path*",
        destination: "/django_ec_backend/media/:path*",
      },
    ];
  },
};

export default nextConfig;