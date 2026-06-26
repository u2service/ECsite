"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

// ==========================================
// 💡 フィルタステートの型定義
// 例: { cpu: ["M1", "M2"], memory: ["8GB"] }
// ==========================================
export type FilterState = Record<string, string[]>;

// 💡 Context が提供する値の型定義
interface FilterContextType {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  updateFilter: (key: string, value: string) => void;
  clearFilters: () => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const useFilter = (): FilterContextType => {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilter must be used within a FilterProvider');
  }
  return context;
};

interface FilterProviderProps {
  children: ReactNode;
}

// ==========================================
// 📄 プロバイダーコンポーネント
// ==========================================
export function FilterProvider({ children }: FilterProviderProps): React.ReactElement {
  // 💡 定義した FilterState 型を割り当てて初期化
  const [filters, setFilters] = useState<FilterState>({});

  // 特定のフィルタ項目をトグル（追加・削除）する関数
  const updateFilter = (key: string, value: string): void => {
    setFilters(prev => {
      const currentValues = prev[key] || [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value) // すでにあれば削除
        : [...currentValues, value];             // なければ追加
      return { ...prev, [key]: newValues };
    });
  };

  // すべてのフィルタをリセットする関数
  const clearFilters = (): void => setFilters({});

  return (
    <FilterContext.Provider value={{ filters, setFilters, updateFilter, clearFilters }}>
      {children}
    </FilterContext.Provider>
  );
}