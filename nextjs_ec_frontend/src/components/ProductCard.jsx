"use client";

import Link from 'next/link';
import Image from 'next/image';
import { getFullImageUrl } from '@/utils/image'; // 追加

export default function ProductCard({ product, isChecked, onCheckChange, showCheckbox = true }) {
  // 独自のロジックを削除し、共通関数を使用
  const imageUrl = getFullImageUrl(product.image);

  return (
    <div className="relative w-[200px] max-w-full border rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 bg-white">
      {/* ▼ チェックボックス：Linkの外側に配置して絶対座標で浮かす ▼ */}
      {/* showCheckbox が true の時だけ表示 */}
      {showCheckbox && (
        <div className="absolute top-2 left-2 z-10 bg-white/80 backdrop-blur-sm rounded px-1 flex items-center shadow-sm border border-gray-200">
          <input
            id={`compare-${product.id}`}
            type="checkbox"
            className="w-4 h-4 cursor-pointer accent-blue-600"
            checked={isChecked}
            onChange={(e) => onCheckChange(product.id, e.target.checked)}
          />
          <label
            htmlFor={`compare-${product.id}`}
            className="ml-1 text-[10px] font-bold text-blue-700 cursor-pointer select-none"
          >
            比較
          </label>
        </div>
      )}

      <Link href={`/products/${product.id}`}>
        <div className="cursor-pointer">
          {/* ▼ 画像表示エリア ▼ */}
          <div className="relative w-full h-48 bg-gray-200 flex items-center justify-center">

            <Image
              src={imageUrl}
              alt={product.name}
              fill // 親要素に合わせて表示
              sizes="200px" // 画像サイズを最適化
              className="object-cover"
              // 全件にpriorityを付けるのではなく、Next.jsの最適化に任せる
              loading="lazy"
            />
          </div>
          {/* ▲ 画像表示エリア ▲ */}
          <div className="p-4">
            <h2 className="text-lg font-semibold truncate">{product.id}</h2>
            <h2 className="text-xs text-gray-500 truncate">{product.brand?.name || product.brand}</h2>
            <h2 className="text-sm font-semibold truncate h-10 line-clamp-2">{product.name}</h2>
            {/* 価格とコメント数を並べて表示 */}
            <div className="flex justify-between items-center mt-2">
              <p className="text-gray-800 font-bold">¥{Number(product.price).toLocaleString()}</p>
              {/* ▼ コメント数を追加 ▼ */}
              <div className="flex items-center text-gray-500 text-xs" title="コメント数">
                <span className="mr-1">💬</span>
                <span>{product.comment_count || 0}</span>
              </div>
              {/* ▲ コメント数を追加 ▲ */}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
