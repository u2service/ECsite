"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

export interface CartItem {
  id: number;
  product_id?: number;
  product?: {
    id: number;
    name: string;
    price: number;
    image?: string;
  };
  quantity: number;
  [key: string]: any;
}

export interface Cart {
  items: CartItem[];
  grand_total: number;
  total_items?: number;
}

interface CartContextType {
  cart: Cart | null;
  loading: boolean;
  fetchCart: (signal?: AbortSignal) => Promise<void>; // 💡 引数でSignalを受け取れるよう拡張
  addItemToCart: (productId: number, quantity: number) => Promise<void>;
  removeItemFromCart: (itemId: number) => Promise<void>;
  updateItemQuantity: (itemId: number, quantity: number) => Promise<void>;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};

interface CartProviderProps { children: ReactNode; }

export const CartProvider = ({ children }: CartProviderProps): React.ReactElement => {
  const { user, fetchOptions } = useAuth();
  
  // カートの初期状態
  const initialCartState: Cart = { items: [], grand_total: 0, total_items: 0 };
  const [cart, setCart] = useState<Cart | null>(initialCartState);
  const [loading, setLoading] = useState<boolean>(true);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  // 💡 1. カート情報を取得 (AbortSignal に対応)
  const fetchCart = useCallback(async (signal?: AbortSignal) => {
    // 💡 未ログインの場合は通信せず初期状態にする（後述のuseEffectでケアするため、ここではローディング終了のみ）
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/api/cart/`, {
        ...fetchOptions('GET'),
        signal // 👈 fetchにsignalを紐付け
      });
      if (res.ok) {
        const data = await res.json();
        if (!signal?.aborted) {
          setCart(data);
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error("Error fetching cart:", error);
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [apiUrl, fetchOptions, user]);

  // 💡 2. ログイン状態の変更を監視して、カートを同期・クリーンアップする
  useEffect(() => {
    const abortController = new AbortController();

    if (user) {
      // 🔓 ログインした、あるいはログイン中の場合は最新のカートを取得
      setLoading(true);
      fetchCart(abortController.signal);
    } else {
      // 🔒 ログアウトした場合は、古いカート情報を残さず即座にクリアする！
      setCart(initialCartState);
      setLoading(false);
    }

    return () => {
      abortController.abort(); // アンマウント時やユーザー切り替え時に古い通信を遮断
    };
  }, [user, fetchCart]);

  // 商品をカートに追加
  const addItemToCart = useCallback(async (productId: number, quantity: number): Promise<void> => {
    try {
      const res = await fetch(`${apiUrl}/api/cart/`, fetchOptions('POST', {
        product_id: productId,
        quantity: quantity,
      }));
      if (res.ok) {
        toast.success("商品をカートに追加しました！");
        fetchCart();
      } else {
        const errData = await res.json();
        toast.error(errData.detail || "カートへの追加に失敗しました。");
      }
    } catch (error) {
      console.error("Error adding item:", error);
    }
  }, [apiUrl, fetchOptions, fetchCart]);

  // 商品をカートから削除
  const removeItemFromCart = useCallback(async (itemId: number): Promise<void> => {
    try {
      const res = await fetch(`${apiUrl}/api/cart-items/${itemId}/`, fetchOptions('DELETE'));
      if (res.ok) {
        fetchCart();
      } else {
        toast.error("商品の削除に失敗しました。");
      }
    } catch (error) {
      console.error("Error removing item:", error);
    }
  }, [apiUrl, fetchOptions, fetchCart]);

  // 商品の数量を更新
  const updateItemQuantity = useCallback(async (itemId: number, quantity: number): Promise<void> => {
    if (quantity < 1) {
      removeItemFromCart(itemId);
      return;
    }
    try {
      const res = await fetch(`${apiUrl}/api/cart-items/${itemId}/`, fetchOptions('PATCH', {
        quantity: quantity,
      }));
      if (res.ok) {
        fetchCart();
      } else {
        toast.error("数量の更新に失敗しました。");
      }
    } catch (error) {
      console.error("Error updating quantity:", error);
    }
  }, [apiUrl, fetchOptions, fetchCart, removeItemFromCart]);

  // カートを完全に空にする関数（フロントの表示用フォールバック）
  const clearCart = useCallback((): void => {
    setCart(initialCartState);
  }, []);

  return (
    <CartContext.Provider value={{ cart, loading, fetchCart, addItemToCart, removeItemFromCart, updateItemQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};
