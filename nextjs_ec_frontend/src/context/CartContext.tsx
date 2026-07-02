"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext'; // ログイン状態を取得するために使用
import { toast } from 'sonner';

// ==========================================
// 💡 カート構造の型定義
// ==========================================
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

// 💡 Context が外部に提供する値（関数・ステート）の型定義
interface CartContextType {
  cart: Cart | null;
  loading: boolean;
  fetchCart: () => Promise<void>;
  addItemToCart: (productId: number, quantity: number) => Promise<void>;
  removeItemFromCart: (itemId: number) => Promise<void>;
  updateItemQuantity: (itemId: number, quantity: number) => Promise<void>;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

interface CartProviderProps {
  children: ReactNode;
}

// ==========================================
// 📄 プロバイダーコンポーネント
// ==========================================
export const CartProvider = ({ children }: CartProviderProps): React.ReactElement => {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { user, fetchOptions } = useAuth(); // AuthContextからユーザー情報と共通のfetchオプションを取得
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

  // カート情報を取得または作成する関数
  const fetchCart = useCallback(async (): Promise<void> => {
    console.log("fetchCart: 取得開始");
    if (!user) {
      setCart(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/cart/`, fetchOptions('GET'));
      if (res.ok) {
        const data: Cart = await res.json();

        // ★ レースコンディション対策：
        // URLに session_id が含まれている場合は、決済直後なのでサーバーのデータが古くても無視して空にする
        const params = new URLSearchParams(window.location.search);
        if (params.get('session_id')) {
          console.log("Successページのため、空のカート状態を維持します");
          setCart({ items: [], grand_total: 0 });
        } else {
          setCart(data);
        }
      } else {
        setCart(null);
      }
    } catch (error) {
      console.error("Error fetching cart:", error);
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, [user, apiUrl, fetchOptions]);

  // ユーザーのログイン状態が変わったらカートを再取得
  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // カートに商品を追加する関数
  const addItemToCart = useCallback(async (productId: number, quantity: number): Promise<void> => {
    if (!user) {
      toast("ログインしてください。")
      return;
    }
    try {
      const res = await fetch(`${apiUrl}/api/cart/add-item/`, fetchOptions('POST', {
        product_id: productId,
        quantity: quantity,
      }));
      if (res.ok) {
        const data: Cart = await res.json();
        setCart(data); // サーバーからの最新のカート情報で更新
        toast("カートに商品を追加しました。")
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error("カート追加失敗:", res.status, errorData);
        toast.error(`カートへの追加に失敗しました。 (Error: ${res.status})`)
      }
    } catch (error) {
      console.error("Error adding item to cart:", error);
    }
  }, [user, apiUrl, fetchOptions]);

  // カート内の商品を削除する関数
  const removeItemFromCart = useCallback(async (itemId: number): Promise<void> => {
    try {
      const res = await fetch(`${apiUrl}/api/cart-items/${itemId}/`, fetchOptions('DELETE'));
      if (res.ok) {
        // 削除成功後、カート情報を再取得して更新
        fetchCart();
      } else {
        toast.error("商品の削除に失敗しました。")
      }
    } catch (error) {
      console.error("Error removing item:", error);
    }
  }, [apiUrl, fetchOptions, fetchCart]);

  // カート内の商品の数量を更新する関数
  const updateItemQuantity = useCallback(async (itemId: number, quantity: number): Promise<void> => {
    if (quantity < 1) {
      // 数量が0以下の場合は商品を削除
      removeItemFromCart(itemId);
      return;
    }
    try {
      const res = await fetch(`${apiUrl}/api/cart-items/${itemId}/`, fetchOptions('PATCH', {
        quantity: quantity,
      }));
      if (res.ok) {
        // 更新成功後、カート情報を再取得して更新
        fetchCart();
      } else {
        toast.error("数量の更新に失敗しました。")
      }
    } catch (error) {
      console.error("Error updating quantity:", error);
    }
  }, [apiUrl, fetchOptions, fetchCart, removeItemFromCart]);

  // カートを空にする関数
  // 💡 useCallbackでラップし、型安全に外部に提供できるよう修正
  const clearCart = useCallback((): void => {
    // フロントエンドのステートを初期値に戻す
    setCart({
      items: [],
      grand_total: 0,
      total_items: 0
    });
    console.log("Cart state has been cleared.");
  }, []);
  
  return (
    <CartContext.Provider value={{ 
      cart, 
      loading, 
      fetchCart, // 💡 プロバイダー値への入れ忘れを補填しました
      addItemToCart, 
      removeItemFromCart, 
      updateItemQuantity, 
      clearCart 
    }}>
      {children}
    </CartContext.Provider>
  );
};