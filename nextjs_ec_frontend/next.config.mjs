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
    // 開発環境（ローカル）のときだけ機能させる
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
    
    // 本番（Vercel）は vercel.json 側でルーティングするため、ここは空にする
    return [];
  },
};

export default nextConfig;