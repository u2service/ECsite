"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useFilter } from '@/context/FilterContext';
import Link from 'next/link';

// カテゴリを表示するサブコンポーネント（変更なし）
const CategoryItem = ({ category }) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = category.children && category.children.length > 0;

  return (
    <li className="ml-4">
      <div className="flex items-center py-1">
        {hasChildren && (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="mr-1 text-xs w-4"
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
      {hasChildren && isOpen && (
        <ul className="border-l border-gray-200">
          {category.children.map(child => (
            <CategoryItem key={child.id} category={child} />
          ))}
        </ul>
      )}
    </li>
  );
};

export default function CategorySidebar() {
  const [categories, setCategories] = useState([]);
  const [specOptions, setSpecOptions] = useState({});
  const params = useParams();
  const categoryId = params?.id; // 安全に取得
  const { filters, updateFilter, clearFilters } = useFilter();

  // 1. カテゴリツリーの取得（初回のみ）
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/category-tree/`);
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
        }
      } catch (err) {
        console.error("Failed to fetch category tree:", err);
      }
    };
    fetchCategories();
  }, []);

  // 2. カテゴリが変わったらスペック選択肢を取得（堅牢化）
  useEffect(() => {
    // クリーンアップ用のフラグ（競合防止）
    let isMounted = true;

    const fetchSpecs = async () => {
      if (!categoryId) {
        setSpecOptions({});
        return;
      }

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/category-spec-values/${categoryId}/`);
        if (res.ok) {
          const data = await res.json();
          // コンポーネントがまだ存在し、最新のリクエストである場合のみ反映
          if (isMounted) {
            setSpecOptions(data);
          }
        } else {
          // エラー（404など）の場合はクリア
          if (isMounted) setSpecOptions({});
        }
      } catch (err) {
        console.error("Failed to fetch specs:", err);
        if (isMounted) setSpecOptions({});
      }
    };

    fetchSpecs();

    return () => {
      isMounted = false; // コンポーネントが消えるか、次のcategoryIdが来た時にフラグを倒す
    };
  }, [categoryId]);

  return (
    <aside className="space-y-8">
      {/* カテゴリ一覧 */}
      <div className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold mb-4 border-b pb-2">カテゴリ</h2>
        <ul>
          {categories.map(category => (
            <CategoryItem key={category.id} category={category} />
          ))}
        </ul>
      </div>

      {/* 絞り込みパネル (スペックが存在する場合のみ表示) */}
      {specOptions && Object.keys(specOptions).length > 0 && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm sticky top-4">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h3 className="font-bold text-lg text-gray-800">絞り込み</h3>
            {Object.values(filters).some(v => v && v.length > 0) && (
              <button
                onClick={clearFilters}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
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
                  const isActive = filters[key]?.includes(val);
                  return (
                    <button
                      key={val}
                      onClick={() => updateFilter(key, val)}
                      className={`px-3 py-1.5 rounded-full text-xs transition-all duration-200 border ${
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
