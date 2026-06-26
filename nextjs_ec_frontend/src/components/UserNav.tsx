"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';

// ==========================================
// 💡 カートアイテムの暫定型定義
// ==========================================
interface CartItem {
  id: number;
  quantity: number;
}

export default function UserNav(): React.ReactElement {
  const router = useRouter();
  
  // AuthContext から必要なステート・関数・環境変数を取得
  const { user, logoutUser, secureFetch, fetchOptions } = useAuth();
  
  // 💡 `as any` を少しマイルドにしつつ、カート構造の型を満たす
  const { cart } = useCart() as { cart: { items: CartItem[] } | null };
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

  // カート内の合計商品数を計算
  const totalItems = cart 
    ? cart.items.reduce((sum: number, item: CartItem) => sum + item.quantity, 0) 
    : 0;

  // 💡 画面を遷移させる前に、その場でセッションを先制チェックする共通関数
  const handleProtectedNavigation = async (
    e: React.MouseEvent<HTMLAnchorElement>, 
    destinationPath: string
  ): Promise<void> => {
    // ① 通常の自動ページ遷移をその場で絶対にさせないようブロック！
    e.preventDefault();

    try {
      // ② その場でバックエンドに「セッションがまだ生きているか」を問い合わせる
      const res = await secureFetch(`${apiUrl}/api/auth/user/`, fetchOptions('GET'));
      
      if (res.ok) {
        // 🍏 セッションが正常なら、ここで初めて目的のページへ安全に遷移
        router.push(destinationPath);
      } else {
        // 🍎 401（タイムアウト）だった場合
        // secureFetch 内部のインターセプターが自動でログアウトや画面リダイレクトを
        // 処理するため、ここでは何もしなくてOK
      }
    } catch (error) {
      console.error(`${destinationPath} 移動前のセッションチェックに失敗しました:`, error);
    }
  };

  return (
    <div className="flex items-center">
      {/* 💡 カートボタンのクリックを先制コントロール */}
      <a 
        href="/cart" 
        onClick={(e) => handleProtectedNavigation(e, '/cart')} 
        className="mr-4 hover:underline cursor-pointer"
      >
        カート {user && totalItems > 0 && `(${totalItems})`}
      </a>
      
      {user ? (
        <>
          <span className="mr-4 text-sm hidden md:inline">ようこそ, {user.username}さん</span>
          
          {/* 💡 注文履歴ボタンのクリックも同様に先制コントロール */}
          <a 
            href="/orders" 
            onClick={(e) => handleProtectedNavigation(e, '/orders')} 
            className="mr-4 hover:underline cursor-pointer"
          >
            注文履歴
          </a>

          <button 
            onClick={logoutUser} 
            className="bg-red-500 hover:bg-red-700 text-white text-sm font-bold py-1 px-3 rounded transition-colors focus:outline-none"
          >
            ログアウト
          </button>
        </>
      ) : (
        <>
          <Link href="/login" className="mr-4 hover:text-gray-300 transition-colors">ログイン</Link>
          <Link href="/signup" className="hover:text-gray-300 transition-colors">会員登録</Link>
        </>
      )}
    </div>
  );
}