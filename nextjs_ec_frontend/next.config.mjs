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
 };

export default nextConfig;
