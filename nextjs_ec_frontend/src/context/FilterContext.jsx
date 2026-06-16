"use client";
import { createContext, useContext, useState } from 'react';

const FilterContext = createContext();

export function FilterProvider({ children }) {
  const [filters, setFilters] = useState({}); // { cpu: ["M1", "M2"], memory: ["8GB"] }

  const updateFilter = (key, value) => {
    setFilters(prev => {
      const currentValues = prev[key] || [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value) // すでにあれば削除
        : [...currentValues, value]; // なければ追加
      return { ...prev, [key]: newValues };
    });
  };

  const clearFilters = () => setFilters({});

  return (
    <FilterContext.Provider value={{ filters, setFilters, updateFilter, clearFilters }}>
      {children}
    </FilterContext.Provider>
  );
}

export const useFilter = () => useContext(FilterContext);
