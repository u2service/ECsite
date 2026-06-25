"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';

export default function UserNav() {
  const router = useRouter();
  
  // AuthContext から必要なステート・関数・環境変数を取得
  const { user, logoutUser, secureFetch, fetchOptions } = useAuth();
  const { cart } = useCart() as any; // CartContext の型に合わせて適宜キャスト
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  // カート内の合計商品数を計算
  const totalItems = cart 
    ? cart.items.reduce((sum: number, item: any) => sum + item.quantity, 0) 
    : 0;

  // 💡 🌟 画面を遷移させる前に、その場でセッションを先制チェックする共通関数（型定義付き）
  const handleProtectedNavigation = async (
    e: React.MouseEvent<HTMLAnchorElement>, 
    destinationPath: string
  ) => {
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
        // 💡 自分でアラート（alert("")）を出すのを完全にやめます！
        // なぜなら、secureFetch を叩いた時点で、AuthContext の中央監視が
        // 自動的に現在の画面に応じた最適なリダイレクト処理（アラート出力など）を
        // 重複なく実行してくれるからです。
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
            className="bg-red-500 hover:bg-red-700 text-white text-sm font-bold py-1 px-3 rounded transition-colors"
          >
            ログアウト
          </button>
        </>
      ) : (
        <>
          <Link href="/login" className="mr-4">ログイン</Link>
          <Link href="/signup">会員登録</Link>
        </>
      )}
    </div>
  );
}