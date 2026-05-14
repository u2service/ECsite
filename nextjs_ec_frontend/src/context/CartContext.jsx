"use client";

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext'; // ログイン状態を取得するために使用

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user, fetchOptions } = useAuth(); // AuthContextからユーザー情報と共通のfetchオプションを取得
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  // カート情報を取得または作成する関数を useCallback で囲む
  const fetchCart = useCallback(async () => {
    console.log("fetchCart: 取得開始"); // 追加
    if (!user) {
      setCart(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/cart/`, fetchOptions('GET'));
      if (res.ok) {
        const data = await res.json();

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
  }, [user, apiUrl, fetchOptions]); // 依存関係を指定

  // ユーザーのログイン状態が変わったらカートを再取得
  useEffect(() => {
    fetchCart();
  }, [fetchCart]); // fetchCart 自体を依存配列に入れます

  // カートに商品を追加する関数
  const addItemToCart = useCallback(async (productId, quantity) => {
    if (!user) {
      alert("ログインしてください。");
      return;
    }
    try {
      const res = await fetch(`${apiUrl}/api/cart/add-item/`, fetchOptions('POST', {
        product_id: productId,
        quantity: quantity,
      }));
      if (res.ok) {
        const data = await res.json();
        setCart(data); // サーバーからの最新のカート情報で更新
        alert("カートに商品を追加しました。");
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error("カート追加失敗:", res.status, errorData);
        alert(`カートへの追加に失敗しました。 (Error: ${res.status})`);
      }
    } catch (error) {
      console.error("Error adding item to cart:", error);
    }
  }, [user, apiUrl, fetchOptions]); // 依存関係を指定

  // カート内の商品を削除する関数
  const removeItemFromCart = useCallback(async (itemId) => {
    try {
      const res = await fetch(`${apiUrl}/api/cart-items/${itemId}/`, fetchOptions('DELETE'));
      if (res.ok) {
        // 削除成功後、カート情報を再取得して更新
        fetchCart();
      } else {
        alert("商品の削除に失敗しました。");
      }
    } catch (error) {
      console.error("Error removing item:", error);
    }
  }, [user, apiUrl, fetchOptions]); // 依存関係を指定

  // カート内の商品の数量を更新する関数
  const updateItemQuantity = useCallback(async (itemId, quantity) => {
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
        alert("数量の更新に失敗しました。");
      }
    } catch (error) {
      console.error("Error updating quantity:", error);
    }
  }, [apiUrl, fetchOptions, fetchCart, removeItemFromCart]);

  const value = {
    cart,
    loading,
    fetchCart,
    addItemToCart,
    removeItemFromCart,
    updateItemQuantity,
  };

  // カートを空にする関数
  const clearCart = () => {
    // 1. フロントエンドのステートを初期値に戻す
    setCart({
      items: [],
      grand_total: 0,
      total_items: 0 // もし定義していれば
    });
    
    // 2. もし localStorage などを使っている場合はそれも消す
    // localStorage.removeItem('cart_data');

    console.log("Cart state has been cleared.");
  };
  
  return (
    <CartContext.Provider value={{ cart, loading, addItemToCart, removeItemFromCart, updateItemQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};
