"use client"; // クライアントコンポーネント宣言

import { useState, useEffect } from 'react';
import ProductCard from './ProductCard';
import FloatingCompareBar from './FloatingCompareBar'; // フローティングUI

export default function ProductListClient({ products }) {
  const [checkedIds, setCheckedIds] = useState([]); // 型定義を削除

  // 商品リスト（検索結果）が入れ替わったら、選択をリセットする
  useEffect(() => {
    setCheckedIds([]);
  }, [products]);
    
  const handleCheck = (id, isChecked) => {
    if (isChecked) {
      // 1. まず現在の個数をチェック（alertは更新関数の外で呼ぶ）
      // if (checkedIds.length >= 5) {
      //   alert("比較できる商品は5つまでです。");
      //   return; // ここで処理を中断
      // }
      
      // 2. 問題なければステートを更新
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
