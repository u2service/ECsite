"use client";

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    const fetchCategories = async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/category-tree/`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    };
    fetchCategories();
  }, []);

  return (
    <aside className="w-64 bg-gray-50 p-4 rounded-lg shadow-sm">
      <h2 className="text-xl font-bold mb-4 border-b pb-2">カテゴリ</h2>
      <ul>
        {categories.map(category => (
          <CategoryItem key={category.id} category={category} />
        ))}
      </ul>
    </aside>
  );
}
