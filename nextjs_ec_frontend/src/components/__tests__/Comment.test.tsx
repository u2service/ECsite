import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CommentSection from '../CommentSection';
import CommentItem, { Comment } from '../CommentItem';
import * as AuthContextModule from '@/context/AuthContext';

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

describe('CommentSection（コメント投稿・バリデーション）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('未ログイン時はログイン誘導メッセージが表示され投稿フォームが非表示であること', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      loading: false,
      loginUser: vi.fn(),
      logoutUser: vi.fn(),
      registerUser: vi.fn(),
      fetchOptions: vi.fn(),
      secureFetch: vi.fn(),
    });

    render(<CommentSection productId={1} />);

    await waitFor(() => {
      expect(screen.queryByText('コメントを読み込み中...')).not.toBeInTheDocument();
    });

    expect(screen.getByText(/コメントを投稿するには/)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('商品についての感想を書き込んでください...')).not.toBeInTheDocument();
  });

  it('ログイン時、空文字または空白のみの場合は投稿ボタンが非活性であること（バリデーション）', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { pk: 1, username: 'tester', email: 't@example.com' },
      loading: false,
      loginUser: vi.fn(),
      logoutUser: vi.fn(),
      registerUser: vi.fn(),
      fetchOptions: vi.fn(),
      secureFetch: vi.fn(),
    });

    render(<CommentSection productId={1} />);

    await waitFor(() => {
      expect(screen.queryByText('コメントを読み込み中...')).not.toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText('商品についての感想を書き込んでください...');
    const submitButton = screen.getByRole('button', { name: 'コメントを投稿する' });

    // 初期状態（空文字）: disabled
    expect(submitButton).toBeDisabled();

    // 空白文字のみ入力: disabled のまま
    fireEvent.change(textarea, { target: { value: '    ' } });
    expect(submitButton).toBeDisabled();

    // 有効な文字を入力: 活性化
    fireEvent.change(textarea, { target: { value: '素晴らしい商品でした！' } });
    expect(submitButton).not.toBeDisabled();
  });
});

describe('CommentItem（投票ハンドリング）', () => {
  const baseComment: Comment = {
    id: 10,
    user_name: 'alice',
    created_at: '2026-06-25T15:30:00Z',
    content: '使いやすいです。',
    good_count: 5,
    ng_count: 1,
    current_user_vote: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('未ログイン時に投票ボタンをクリックするとエラー通知が出ること', async () => {
    const { toast } = await import('sonner');
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      loading: false,
      loginUser: vi.fn(),
      logoutUser: vi.fn(),
      registerUser: vi.fn(),
      fetchOptions: vi.fn(),
      secureFetch: vi.fn(),
    });

    render(<CommentItem comment={baseComment} onVoteUpdate={vi.fn()} />);

    const goodButton = screen.getByRole('button', { name: /👍/ });
    fireEvent.click(goodButton);

    expect(toast.error).toHaveBeenCalledWith('投票するにはログインが必要です');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('ログイン時にGoodボタンをクリックするとAPIが呼ばれ onVoteUpdate が実行されること', async () => {
    const mockOnVoteUpdate = vi.fn();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: { pk: 2, username: 'bob', email: 'b@example.com' },
      loading: false,
      loginUser: vi.fn(),
      logoutUser: vi.fn(),
      registerUser: vi.fn(),
      fetchOptions: (method: string, body?: any) => ({ method, body: JSON.stringify(body) }),
      secureFetch: vi.fn(),
    });

    const updatedComment: Comment = {
      ...baseComment,
      good_count: 6,
      current_user_vote: 'good',
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => updatedComment,
    });

    render(<CommentItem comment={baseComment} onVoteUpdate={mockOnVoteUpdate} />);

    const goodButton = screen.getByRole('button', { name: /👍/ });
    fireEvent.click(goodButton);

    await waitFor(() => {
      expect(mockOnVoteUpdate).toHaveBeenCalledWith(updatedComment);
    });
  });
});