// src/components/Header.jsx
import { Suspense } from 'react';
import Link from 'next/link';
import SearchBar from './SearchBar'; 
import UserNav from './UserNav'; // 動的な部分を切り出す

export default function Header() {
  return (
    <header className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        {/* ロゴやホームリンクは静的なのでサーバー側でOK */}
        <Link href="/" className="text-xl font-bold">
          My EC Store
        </Link>

        <Link href="/portfolio">ポートフォリオを見る</Link>

        {/* 検索バーは通常入力を伴うので CC のまま (後で最適化可能) */}
        <Suspense fallback={<div className="w-48 h-8 bg-gray-700 rounded-md animate-pulse" />}>
          <SearchBar />
        </Suspense>

        <nav className="flex items-center">
          <Link href="/" className="mr-4">ホーム</Link>
          
          {/* ユーザー情報やカート数など、Contextが必要な部分だけを切り出す */}
          <UserNav />
        </nav>
      </div>
    </header>
  );
}
