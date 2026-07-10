"use client";

import React, { useState } from 'react'; // 💡 useEffect を削除
import { useRouter, useSearchParams } from 'next/navigation';

export default function SearchBar(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // 💡 URLの検索ワード（q）を取得（無ければ空文字）
  const currentQuery = searchParams.get('q') || '';

  // 💡 【修正点1】useState の初期値として URL の値を直接セットする（遅延評価）
  const [query, setQuery] = useState<string>(() => currentQuery);

  // フォーム送信時の処理
  const handleSearch = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push('/');
    }
  };

  return (
    <form onSubmit={handleSearch} className="flex items-center">
      <input
        type="text"
        // 💡 【修正点2】key に URL の検索ワードを指定する
        // これにより、URL のクエリ（q）が変わるたびに入力欄の状態が自動で初期化・同期されます！
        key={currentQuery}
        defaultValue={query} 
        onChange={(e) => setQuery(e.target.value)}
        placeholder="商品を検索..."
        className="px-3 py-1 border rounded-l-md focus:outline-none w-32 md:w-64"
      />
      <button
        type="submit"
        className="bg-blue-600 px-4 py-1 border border-blue-600 rounded-r-md hover:bg-blue-700 transition-colors"
      >
        検索
      </button>
    </form>
  );
}