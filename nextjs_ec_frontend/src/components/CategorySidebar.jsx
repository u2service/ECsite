"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useFilter } from '@/context/FilterContext';
import Link from 'next/link';

// 再帰的にカテゴリを表示するサブコンポーネント
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
  const categoryId = params.id; // URLからカテゴリIDを取得
  const { filters, updateFilter, clearFilters } = useFilter();

  useEffect(() => {
    const fetchCategories = async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/category-tree/`);
      if (res.ok) setCategories(await res.json());
    };
    fetchCategories();
  }, []);

  // カテゴリが変わったらスペック選択肢を取得
  useEffect(() => {
    if (categoryId) {
      const fetchSpecs = async () => {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/category-spec-values/${categoryId}/`);
        if (res.ok) setSpecOptions(await res.ok ? await res.json() : {});
      };
      fetchSpecs();
    } else {
      setSpecOptions({});
    }
  }, [categoryId]);

  return (
    <aside className="space-y-8">
      {/* カテゴリ一覧 */}

      <div className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold mb-4 border-b pb-2">カテゴリ</h2>
        <ul>{categories.map(c => <CategoryItem key={c.id} category={c} />)}</ul>
      </div>

      {/* 絞り込みパネル (カテゴリページのみ表示) */}
      {Object.keys(specOptions).length > 0 && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h3 className="font-bold text-lg">絞り込み</h3>
            {Object.values(filters).some(v => v.length > 0) && (
              <button onClick={clearFilters} className="text-xs text-blue-600 underline">クリア</button>
            )}
          </div>
          {Object.entries(specOptions).map(([key, spec]) => (
            <div key={key} className="mb-6">
              <h4 className="font-semibold text-sm text-gray-600 mb-3">{spec.display_name}</h4>
              <div className="flex flex-wrap gap-2">
                {spec.values.map(val => {
                  const isActive = filters[key]?.includes(val);
                  return (
                    <button
                      key={val}
                      onClick={() => updateFilter(key, val)}
                      className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                        isActive ? "bg-blue-600 text-white border-blue-600" : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-200"
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
