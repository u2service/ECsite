import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';

// next/navigation の useRouter をモック化
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// sonner (トースト通知) をモック化
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.cookie = '';
    // fetch の初期化
    global.fetch = vi.fn();
  });

  it('マウント時にセッション（/api/auth/user/）を確認し未ログイン時は user: null となること', async () => {
    // 401 (未ログイン) を返却
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ detail: 'Not authenticated' }),
    });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
  });

  it('ログイン成功時にユーザー情報が保持されトップページへ遷移すること', async () => {
    // 1. 初期マウント時の /api/auth/user/ -> 未ログイン
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => expect(result.current.loading).toBe(false));

    // 2. ログインAPI (/api/auth/login/) のレスポンスをモック
    const mockUser = { pk: 1, username: 'testuser', email: 'test@example.com' };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ user: mockUser }),
    });

    await act(async () => {
      await result.current.loginUser('test@example.com', 'password123');
    });

    expect(result.current.user).toEqual(mockUser);
    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('fetchOptions が Cookie の csrftoken を X-CSRFToken ヘッダーに自動付加すること', async () => {
    (global.fetch as any).mockResolvedValueOnce({ ok: false });
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Cookie に CSRF トークンを模倣
    document.cookie = 'csrftoken=mock-csrf-token-123; path=/';

    // POST リクエスト用 options
    const postOptions = result.current.fetchOptions('POST', { key: 'value' });
    expect((postOptions.headers as Record<string, string>)['X-CSRFToken']).toBe('mock-csrf-token-123');
    expect(postOptions.credentials).toBe('include');

    // GET リクエスト時は CSRF トークンが付与されないこと
    const getOptions = result.current.fetchOptions('GET');
    expect((getOptions.headers as Record<string, string>)['X-CSRFToken']).toBeUndefined();
  });

  it('ログアウト時にユーザー情報が null になり /login へリダイレクトすること', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ pk: 1, username: 'active_user', email: 'a@example.com' }),
    });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.user).not.toBeNull());

    // ログアウトAPI呼び出し
    (global.fetch as any).mockResolvedValueOnce({ ok: true });

    await act(async () => {
      await result.current.logoutUser();
    });

    expect(result.current.user).toBeNull();
    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('secureFetch で 401 が発生した際にセッションタイムアウトイベントを発火し /login?timeout=true へリダイレクトすること', async () => {
    const mockUser = { pk: 1, username: 'user1', email: 'u@example.com' };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.user).toEqual(mockUser));

    // secureFetch で 401 レスポンスを返す
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    await act(async () => {
      await result.current.secureFetch('/api/protected/', { method: 'GET' });
    });

    await waitFor(() => {
      expect(result.current.user).toBeNull();
      expect(mockPush).toHaveBeenCalledWith('/login?timeout=true');
    });
  });
});