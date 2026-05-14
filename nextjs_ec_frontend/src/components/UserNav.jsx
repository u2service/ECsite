// src/components/UserNav.jsx
"use client";

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';

export default function UserNav() {
  const { user, logoutUser } = useAuth();
  const { cart } = useCart();

  const totalItems = cart ? cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0;

  return (
    <div className="flex items-center">
      <Link href="/cart" className="mr-4">
        カート {user && totalItems > 0 && `(${totalItems})`}
      </Link>
      
      {user ? (
        <>
          <span className="mr-4 text-sm hidden md:inline">ようこそ, {user.username}さん</span>
          <Link href="/orders" className="mr-4 hover:underline">注文履歴</Link>
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
