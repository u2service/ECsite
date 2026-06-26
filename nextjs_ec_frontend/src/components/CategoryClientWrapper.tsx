"use client";

import React, { useState, useEffect } from 'react';
import { useFilter } from '@/context/FilterContext';
import ProductCard from '@/components/ProductCard';
import FloatingCompareBar from '@/components/FloatingCompareBar';
import { Product } from '@/types/product';

// ==========================================
// 💡 型定義（Interfaces）
// ==========================================

interface CategoryClientWrapperProps {
  products: Product[];
  categoryId: string | number;
}

export default function CategoryClientWrapper({ 
  products: initialProducts, 
  categoryId 
}: CategoryClientWrapperProps): React.ReactElement {
  // サーバーから渡された初期商品またはフィルタ後の商品を管理
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [checkedIds, setCheckedIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Contextから現在のフィルタ状態と、フィルタを操作する関数を取得
  const { filters, setFilters } = useFilter();

  // 1. カテゴリが変更されたら、フィルタをクリアし商品を初期状態に戻す
  useEffect(() => {
    setProducts(initialProducts);
    setFilters({});
    setCheckedIds([]);
  }, [initialProducts, categoryId, setFilters]);

  // 2. フィルタ状態（filters）が変更されたら、APIを叩いて商品を再取得（複数選択対応）
  useEffect(() => {
    // フィルタが空であり、かつ現在の表示が初期商品と同じならリクエストをスキップ
    // 💡 Object.values(filters) の各値を string[] 型として明示的に扱う
    const isFiltersEmpty = Object.values(filters).every(
      (v) => !v || (v as string[]).length === 0
    );
    if (isFiltersEmpty && products === initialProducts) return;

    const fetchFilteredProducts = async () => {
      setIsLoading(true);
      try {
        let url = `${process.env.NEXT_PUBLIC_API_URL}/api/products/?category_id=${categoryId}`;

        // Context内のフィルタ（配列）をカンマ区切りでパラメータ化
        // 例: spec_memory=8GB,16GB
        // 💡 entries をループする際、values が文字列の配列であることを明示
        Object.entries(filters).forEach(([key, value]) => {
          const values = value as string[]; // 👈 ここで型を確定させる
          if (values && values.length > 0) {
            url += `&spec_${key}=${encodeURIComponent(values.join(','))}`;
          }
        });

        const res = await fetch(url);
        if (res.ok) {
          const data: Product[] = await res.json();
          setProducts(data);
        }
      } catch (error) {
        console.error("Failed to fetch filtered products:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFilteredProducts();
    // 💡 無限ループ防止のため依存配列に products 自身は含めない
  }, [filters, categoryId]);

  // 比較チェックのハンドラ
  const handleCheck = (id: number, isChecked: boolean): void => {
    setCheckedIds(prev => isChecked ? [...prev, id] : prev.filter(i => i !== id));
  };

  return (
    <div className="min-w-0">
      {isLoading ? (
        /* 取得中のローディング表示 */
        <div className="flex flex-col items-center justify-center py-24">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 rounded-full border-t-transparent mb-4"></div>
          <p className="text-gray-500 font-medium">条件に合わせて商品を検索中...</p>
        </div>
      ) : products.length === 0 ? (
        /* 商品が0件の場合の表示 */
        <div className="bg-gray-50 p-12 rounded-xl text-center border-2 border-dashed border-gray-200">
          <p className="text-gray-600 text-lg mb-4">条件に一致する商品が見つかりませんでした。</p>
          <button
            onClick={() => setFilters({})}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            すべての絞り込みを解除
          </button>
        </div>
      ) : (
        /*
           グリッド表示の調整：
           - md(768px)以上でサイドバーが横に来るため、そこでは2列
           - lg(1024px)以上で3列
           - xl(1280px)以上で4列表示
        */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              isChecked={checkedIds.includes(product.id)}
              onCheckChange={handleCheck}
            />
          ))}
        </div>
      )}

      {/* 比較用フローティングバー */}
      {checkedIds.length > 0 && (
        <FloatingCompareBar
          checkedCount={checkedIds.length}
          checkedIds={checkedIds}
          onClear={() => setCheckedIds([])}
        />
      )}
    </div>
  );
}