import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { FilterProvider, useFilter } from '../FilterContext';

describe('FilterContext', () => {
  it('初期状態は空のオブジェクトであること', () => {
    const { result } = renderHook(() => useFilter(), {
      wrapper: FilterProvider,
    });
    expect(result.current.filters).toEqual({});
  });

  it('updateFilter により新しいスペック値が追加されること', () => {
    const { result } = renderHook(() => useFilter(), {
      wrapper: FilterProvider,
    });

    act(() => {
      result.current.updateFilter('cpu', 'M2');
    });

    expect(result.current.filters).toEqual({ cpu: ['M2'] });

    // 同一キーに別の値を追加
    act(() => {
      result.current.updateFilter('cpu', 'M3');
    });

    expect(result.current.filters).toEqual({ cpu: ['M2', 'M3'] });
  });

  it('updateFilter で既存の値を再度選択した際にトグル削除されること', () => {
    const { result } = renderHook(() => useFilter(), {
      wrapper: FilterProvider,
    });

    act(() => {
      result.current.updateFilter('memory', '16GB');
      result.current.updateFilter('memory', '32GB');
    });
    expect(result.current.filters.memory).toEqual(['16GB', '32GB']);

    // 16GB を再選択して解除
    act(() => {
      result.current.updateFilter('memory', '16GB');
    });
    expect(result.current.filters.memory).toEqual(['32GB']);
  });

  it('複数のフィルタキーが独立して保持されること', () => {
    const { result } = renderHook(() => useFilter(), {
      wrapper: FilterProvider,
    });

    act(() => {
      result.current.updateFilter('os', 'mac');
      result.current.updateFilter('storage', '512GB');
    });

    expect(result.current.filters).toEqual({
      os: ['mac'],
      storage: ['512GB'],
    });
  });

  it('clearFilters によりすべての条件がリセットされること', () => {
    const { result } = renderHook(() => useFilter(), {
      wrapper: FilterProvider,
    });

    act(() => {
      result.current.updateFilter('os', 'win');
      result.current.updateFilter('cpu', 'Core i7');
    });

    act(() => {
      result.current.clearFilters();
    });

    expect(result.current.filters).toEqual({});
  });
});