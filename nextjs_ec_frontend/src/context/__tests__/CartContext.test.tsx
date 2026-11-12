import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { CartProvider, useCart } from '../CartContext';
import * as AuthContextModule from '../AuthContext';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('CartContext', () => {
  const mockUser = { pk: 1, username: 'cart_user', email: 'cart@example.com' };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();

    // デフォルトでログイン状態をモック
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: mockUser,
      loading: false,
      loginUser: vi.fn(),
      logoutUser: vi.fn(),
      registerUser: vi.fn(),
      fetchOptions: (method: string, body?: any) => ({
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      }),
      secureFetch: vi.fn(),
    });
  });

  it('ログイン時に /api/cart/ からカート情報を自動取得すること', async () => {
    const mockCartData = {
      items: [
        { id: 101, product: { id: 1, name: '商品A', price: 2000 }, quantity: 2 },
      ],
      grand_total: 4000,
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCartData,
    });

    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.cart?.items.length).toBe(1);
    expect(result.current.cart?.grand_total).toBe(4000);
  });

  it('未ログイン時はカート情報の通信を行わず空状態となること', async () => {
    // 未ログイン状態に上書き
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      loading: false,
      loginUser: vi.fn(),
      logoutUser: vi.fn(),
      registerUser: vi.fn(),
      fetchOptions: vi.fn(),
      secureFetch: vi.fn(),
    });

    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.cart?.items).toEqual([]);
    expect(result.current.cart?.grand_total).toBe(0);
    // fetch が呼ばれていないこと
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('addItemToCart により商品追加後に最新のカート情報が再取得されること', async () => {
    // 1. 初回マウント時: 空のカート
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [], grand_total: 0 }),
    });

    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));

    // 2. カート追加 API のレスポンス
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'success' }),
    });

    // 3. fetchCart による再取得のレスポンス
    const updatedCart = {
      items: [{ id: 102, product: { id: 2, name: '商品B', price: 3000 }, quantity: 1 }],
      grand_total: 3000,
    };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => updatedCart,
    });

    await act(async () => {
      await result.current.addItemToCart(2, 1);
    });

    expect(result.current.cart?.items.length).toBe(1);
    expect(result.current.cart?.grand_total).toBe(3000);
  });

  it('updateItemQuantity で数量 0 を指定した際に自動的に removeItemFromCart が呼ばれること', async () => {
    // 初回取得
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{ id: 105, product: { id: 5, name: '商品C', price: 1000 }, quantity: 1 }],
        grand_total: 1000,
      }),
    });

    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
    await waitFor(() => expect(result.current.cart?.items.length).toBe(1));

    // DELETE API レスポンス
    (global.fetch as any).mockResolvedValueOnce({ ok: true });
    // 削除後の fetchCart
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [], grand_total: 0 }),
    });

    await act(async () => {
      // 数量 0 で更新 -> 削除処理が走る
      await result.current.updateItemQuantity(105, 0);
    });

    // DELETE メソッドでリクエストが飛んでいることを確認
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/cart-items/105/'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('clearCart を呼び出すと即座にローカルのカート状態が空になること', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{ id: 1, product: { id: 1, name: '商品', price: 500 }, quantity: 1 }],
        grand_total: 500,
      }),
    });

    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
    await waitFor(() => expect(result.current.cart?.items.length).toBe(1));

    act(() => {
      result.current.clearCart();
    });

    expect(result.current.cart?.items).toEqual([]);
    expect(result.current.cart?.grand_total).toBe(0);
  });
});