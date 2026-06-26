"use client";

import React, { useState, useEffect } from 'react';
import ProductCard from './ProductCard';
import { Product } from '@/types/product'; // 💡 こちらから呼ぶ
import FloatingCompareBar from './FloatingCompareBar';

// ==========================================
// 💡 Propsの型定義
// ==========================================
interface ProductListClientProps {
  products: Product[]; // 商品データの配列
}

// ==========================================
// 📄 メインコンポーネント
// ==========================================
export default function ProductListClient({ products }: ProductListClientProps): React.ReactElement {
  // 💡 空配列で初期化する場合、ジェネリクスで型を明示しないとエラーになります
  const [checkedIds, setCheckedIds] = useState<number[]>([]);

  // 商品リスト（検索結果など）が入れ替わったら、選択をリセットする
  useEffect(() => {
    setCheckedIds([]);
  }, [products]);
    
  // チェックボックスの状態変化をハンドルする関数
  // 💡 引数の型を ProductCard の定義と完全に一致させます
  const handleCheck = (id: number, isChecked: boolean): void => {
    if (isChecked) {
      // 💡 もし5件制限のロジックを復活させる場合は、ここで checkedIds.length をチェック
      setCheckedIds(prev => [...prev, id]);
    } else {
      setCheckedIds(prev => prev.filter(i => i !== id));
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard 
            key={product.id} 
            product={product} 
            isChecked={checkedIds.includes(product.id)}
            onCheckChange={handleCheck}
          />
        ))}
      </div>

      {/* フローティングUIを表示 */}
      {checkedIds.length > 0 && (
        <FloatingCompareBar 
          checkedCount={checkedIds.length} 
          checkedIds={checkedIds}
          onClear={() => setCheckedIds([])}
        />
      )}
    </>
  );
}