import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FloatingCompareBar from '../FloatingCompareBar';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe('FloatingCompareBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('選択中の商品件数が正しく表示されること', () => {
    render(
      <FloatingCompareBar
        checkedCount={3}
        checkedIds={[1, 2, 3]}
        onClear={vi.fn()}
      />
    );

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('選択中')).toBeInTheDocument();
  });

  it('「クリア」ボタンをクリックすると onClear が呼び出されること', () => {
    const mockClear = vi.fn();
    render(
      <FloatingCompareBar
        checkedCount={2}
        checkedIds={[10, 20]}
        onClear={mockClear}
      />
    );

    const clearButton = screen.getByRole('button', { name: 'クリア' });
    fireEvent.click(clearButton);

    expect(mockClear).toHaveBeenCalledTimes(1);
  });

  it('「比較する」ボタンをクリックするとカンマ区切りのIDパラメータで比較画面へ遷移すること', () => {
    render(
      <FloatingCompareBar
        checkedCount={2}
        checkedIds={[101, 102]}
        onClear={vi.fn()}
      />
    );

    const compareButton = screen.getByRole('button', { name: '比較する' });
    fireEvent.click(compareButton);

    expect(mockPush).toHaveBeenCalledWith('/compare?ids=101,102');
  });

  it('checkedIds が空の場合は比較ボタンを押しても遷移しないこと', () => {
    render(
      <FloatingCompareBar
        checkedCount={0}
        checkedIds={[]}
        onClear={vi.fn()}
      />
    );

    const compareButton = screen.getByRole('button', { name: '比較する' });
    fireEvent.click(compareButton);

    expect(mockPush).not.toHaveBeenCalled();
  });
});