"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState('');

  // 初回レンダリング時やURLが変わった時に検索ワードを同期させる
  useEffect(() => {
    setQuery(searchParams.get('q') || '');
  }, [searchParams]);

  const handleSearch = (e) => {
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
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="商品を検索..."
        className="px-3 py-1 border rounded-l-md text-white focus:outline-none w-32 md:w-64"
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
