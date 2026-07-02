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
       {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
     ],
  },

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
        {
          source: "/media/:path*",
          destination: "http://127.0.0.1:8000/media/:path*",
        },
      ];
    }
    
    return [];
  },
};

export default nextConfig;