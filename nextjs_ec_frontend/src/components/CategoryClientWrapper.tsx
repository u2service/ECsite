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
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [checkedIds, setCheckedIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const { filters, setFilters } = useFilter();

  // 1. カテゴリ変更時のリセット（この処理は現状のままで完璧です！）
  useEffect(() => {
    setProducts(initialProducts);
    setFilters({});
    setCheckedIds([]);
  }, [initialProducts, categoryId, setFilters]);

  // 2. フィルタ状態変更時のAPI再取得（💡AbortControllerを追加）
  useEffect(() => {
    const isFiltersEmpty = Object.values(filters).every(
      (v) => !v || (v as string[]).length === 0
    );
    if (isFiltersEmpty && products === initialProducts) return;

    // 💡 新しい通信を開始する前に、コントローラーを作成
    const abortController = new AbortController();

    const fetchFilteredProducts = async () => {
      setIsLoading(true);
      try {
        let url = `${process.env.NEXT_PUBLIC_API_URL}/api/products/?category_id=${categoryId}`;

        Object.entries(filters).forEach(([key, value]) => {
          const values = value as string[];
          if (values && values.length > 0) {
            url += `&spec_${key}=${encodeURIComponent(values.join(','))}`;
          }
        });

        // 💡 signalを仕込んで通信を管理
        const res = await fetch(url, {
          signal: abortController.signal
        });

        if (res.ok) {
          const data: Product[] = await res.json();
          // 💡 他のクリックによって通信がキャンセルされていない（＝最新の通信である）場合のみ反映
          if (!abortController.signal.aborted) {
            setProducts(data);
          }
        }
      } catch (error: any) {
        // 💡 連続クリックによる自動キャンセル（AbortError）以外のエラーだけをログに出す
        if (error.name !== 'AbortError') {
          console.error("Failed to fetch filtered products:", error);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchFilteredProducts();

    // 💡 クリーンアップ関数：次のフィルタがクリックされた瞬間、または画面から離れたら古い通信を即キャンセル
    return () => {
      abortController.abort();
    };
  }, [filters, categoryId]); // initialProducts や products をここに入れない設計も完璧です！

  // 比較チェックのハンドラ
  const handleCheck = (id: number, isChecked: boolean): void => {
    setCheckedIds(prev => isChecked ? [...prev, id] : prev.filter(i => i !== id));
  };

  return (
    <div className="min-w-0">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 rounded-full border-t-transparent mb-4"></div>
          <p className="text-gray-500 font-medium">条件に合わせて商品を検索中...</p>
        </div>
      ) : products.length === 0 ? (
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