"use client";

import { useState } from 'react';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import FloatingCompareBar from '@/components/FloatingCompareBar';

export default function CategoryClientWrapper({ products, categoryName }) {
  const [checkedIds, setCheckedIds] = useState([]);

  const handleCheck = (id, isChecked) => {
    setCheckedIds(prev => isChecked ? [...prev, id] : prev.filter(i => i !== id));
  };

  if (products.length === 0) {
    return (
      <div className="bg-gray-50 p-10 rounded-lg text-center">
        <p className="text-gray-600 text-lg">「{categoryName}」には現在商品がありません。</p>
        <Link href="/" className="text-blue-600 hover:underline mt-4 inline-block">トップへ戻る</Link>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map(product => (
          <ProductCard
            key={product.id}
            product={product}
            isChecked={checkedIds.includes(product.id)}
            onCheckChange={handleCheck}
          />
        ))}
      </div>

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
