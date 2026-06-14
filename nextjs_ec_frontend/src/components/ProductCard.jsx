"use client";

import Link from 'next/link';
import Image from 'next/image';
import { getFullImageUrl } from '@/utils/image'; // 追加

export default function ProductCard({ product, isChecked, onCheckChange }) {
  // 独自のロジックを削除し、共通関数を使用
  const imageUrl = getFullImageUrl(product.image);

  return (
    <div className="relative w-[200px] max-w-full border rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 bg-white">
      {/* ▼ チェックボックス：Linkの外側に配置して絶対座標で浮かす ▼ */}
      <div className="absolute top-2 left-2 z-10">
        <input
          type="checkbox"
          className="w-5 h-5 cursor-pointer accent-blue-600"
          checked={isChecked}
          onChange={(e) => onCheckChange(product.id, e.target.checked)}
        />
      </div>

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
            <h2 className="text-lg font-semibold truncate">{product.brand?.name || product.brand}</h2>
            <h2 className="text-lg font-semibold truncate">{product.name}</h2>
            <p className="text-gray-800 font-bold mt-2">¥{Number(product.price).toLocaleString()}</p>
          </div>
        </div>
      </Link>
    </div>
  );
}
