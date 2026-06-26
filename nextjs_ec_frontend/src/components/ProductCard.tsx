"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getFullImageUrl } from '@/utils/image';

// ==========================================
// 💡 バックエンド（Django）の構造に合わせた型定義
// ==========================================
export interface Brand {
  id?: number;
  name: string;
}

import { Product } from '@/types/product';

// ==========================================
// 💡 Propsの型定義
// ==========================================
interface ProductCardProps {
  product: Product;
  isChecked?: boolean;                                     // 💡 オプショナルに変更
  onCheckChange?: (id: number, checked: boolean) => void;  // 💡 オプショナルに変更
  showCheckbox?: boolean;                                  // デフォルト値を設定するためオプショナル
}

// ==========================================
// 📄 メインコンポーネント
// ==========================================
export default function ProductCard({ 
  product, 
  isChecked = false,       // 💡 初期値を設定しておくと、渡されなかった時に安全
  onCheckChange, 
  showCheckbox = true 
}: ProductCardProps): React.ReactElement {
  
  // 共通関数を使用して画像URLを取得
  const imageUrl = getFullImageUrl(product.image);

  // ブランド名の表示ロジックを安全に切り出し
  const brandName = typeof product.brand === 'object' 
    ? product.brand?.name 
    : product.brand;

  return (
    <div className="relative w-[200px] max-w-full border rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 bg-white">
      {/* ▼ チェックボックス：showCheckbox が true、かつハンドラーが存在する時だけ表示 ▼ */}
      {showCheckbox && onCheckChange && (
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
              loading="lazy"
            />
          </div>
          {/* ▲ 画像表示エリア ▲ */}

          <div className="p-4">
            <h2 className="text-lg font-semibold truncate text-slate-700">{product.id}</h2>
            {brandName && (
              <h2 className="text-xs text-gray-500 truncate">{brandName}</h2>
            )}
            <h2 className="text-sm font-semibold truncate h-10 line-clamp-2 text-slate-800 mt-0.5">
              {product.name}
            </h2>
            
            {/* 価格とコメント数を並べて表示 */}
            <div className="flex justify-between items-center mt-2">
              <p className="text-gray-800 font-bold">
                ¥{Number(product.price).toLocaleString()}
              </p>
              
              {/* ▼ コメント数 ▼ */}
              <div className="flex items-center text-gray-500 text-xs" title="コメント数">
                <span className="mr-1">💬</span>
                <span>{product.comment_count || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}