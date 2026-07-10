"use client";

import React, { useEffect, useState } from 'react';
import { usePathname, useParams } from 'next/navigation';
import { useFilter } from '@/context/FilterContext';
import Link from 'next/link';

// ==========================================
// 💡 型定義（Interfaces）
// ==========================================
interface Category {
  id: number;
  name: string;
  children?: Category[];
}

interface SpecItem {
  display_name: string;
  values: string[];
}

interface SpecOptions {
  [key: string]: SpecItem;
}

interface CategoryItemProps {
  category: Category;
}

// 🌿 サブコンポーネント（カテゴリツリー表示用）
const CategoryItem = ({ category }: CategoryItemProps): React.ReactElement => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const hasChildren = category.children && category.children.length > 0;

  return (
    <li className="ml-4">
      <div className="flex items-center py-1">
        {hasChildren && (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="mr-1 text-xs w-4 focus:outline-none"
          >
            {isOpen ? '▼' : '▶'}
          </button>
        )}
        <Link
          href={`/categories/${category.id}`}
          className="hover:text-blue-600 transition-colors"
        >
          {category.name}
        </Link>
      </div>
      {hasChildren && isOpen && category.children && (
        <ul className="border-l border-gray-200">
          {category.children.map(child => (
            <CategoryItem key={child.id} category={child} />
          ))}
        </ul>
      )}
    </li>
  );
};

// 📄 メインサイドバーコンポーネント
export default function CategorySidebar(): React.ReactElement {
  const [categories, setCategories] = useState<Category[]>([]);
  const [specOptions, setSpecOptions] = useState<SpecOptions>({});
  const params = useParams();
  const pathname = usePathname();

  const isCategoryPage = pathname.startsWith('/categories/');
  const categoryId = isCategoryPage && params?.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : null;
  
  const { filters, updateFilter, clearFilters } = useFilter();

  // 💡 1. カテゴリツリーの取得（AbortControllerを導入して安全ガード）
  useEffect(() => {
    const abortController = new AbortController();

    const fetchCategories = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/category-tree/`, {
          signal: abortController.signal
        });
        if (res.ok) {
          const data: Category[] = await res.json();
          if (!abortController.signal.aborted) {
            setCategories(data);
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error("Failed to fetch category tree:", err);
        }
      }
    };
    fetchCategories();

    return () => {
      abortController.abort();
    };
  }, []);

  // 💡 2. カテゴリ変更時のスペック取得（isMounted から AbortController へ統一）
  useEffect(() => {
    if (!categoryId) {
      setSpecOptions({});
      return;
    }

    const abortController = new AbortController();

    const fetchSpecs = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/category-spec-values/${categoryId}/`, {
          signal: abortController.signal
        });
        if (res.ok) {
          const data: SpecOptions = await res.json();
          if (!abortController.signal.aborted) {
            setSpecOptions(data);
          }
        } else {
          if (!abortController.signal.aborted) setSpecOptions({});
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error("Failed to fetch specs:", err);
          if (!abortController.signal.aborted) setSpecOptions({});
        }
      }
    };

    fetchSpecs();

    return () => {
      abortController.abort(); // 💡 次のカテゴリがクリックされたら古い通信を即時物理キャンセル！
    };
  }, [categoryId]);

  return (
    <aside className="space-y-8">
      {/* カテゴリ一覧 */}
      <div className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold mb-4 border-b pb-2 text-slate-900">カテゴリ</h2>
        <ul>
          {categories.map(category => (
            <CategoryItem key={category.id} category={category} />
          ))}
        </ul>
      </div>

      {/* 絞り込みパネル */}
      {specOptions && Object.keys(specOptions).length > 0 && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm sticky top-4">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h3 className="font-bold text-lg text-gray-800">絞り込み</h3>
            {Object.values(filters).some(v => {
              const values = v as string[] | undefined;
              return values && values.length > 0;
            }) && (
              <button
                onClick={clearFilters}
                className="text-xs text-blue-600 hover:text-blue-800 underline focus:outline-none"
              >
                クリア
              </button>
            )}
          </div>

          {Object.entries(specOptions).map(([key, spec]) => (
            <div key={key} className="mb-6 last:mb-0">
              <h4 className="font-semibold text-sm text-gray-600 mb-3">
                {spec.display_name}
              </h4>
              <div className="flex flex-wrap gap-2">
                {spec.values.map(val => {
                  const activeList = filters[key] as string[] | undefined;
                  const isActive = activeList?.includes(val) || false;
                  
                  return (
                    <button
                      key={val}
                      onClick={() => updateFilter(key, val)}
                      className={`px-3 py-1.5 rounded-full text-xs transition-all duration-200 border focus:outline-none ${
                        isActive
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-200"
                      }`}
                    >
                      {val}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}