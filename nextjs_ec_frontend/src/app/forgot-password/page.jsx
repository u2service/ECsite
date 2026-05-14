// src/app/forgot-password/page.jsx
"use client";

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const { fetchOptions } = useAuth(); // 共通のfetchオプションをインポート
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const res = await fetch(`${apiUrl}/api/auth/password/reset/`, fetchOptions('POST', { email }));
      if (res.ok) {
        setMessage("パスワードリセット用のメールを送信しました。メールボックスを確認してください。");
      } else {
        setMessage("エラーが発生しました。入力されたメールアドレスが登録されているか確認してください。");
      }
    } catch (error) {
      console.error("Password reset request error:", error);
      setMessage("通信エラーが発生しました。");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <h1 className="text-2xl font-bold text-center mb-6">パスワードをお忘れですか？</h1>
      <p className="text-center text-gray-600 mb-4">登録したメールアドレスを入力してください。パスワード再設定用のリンクをお送りします。</p>
      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
            メールアドレス
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
            required
          />
        </div>
        <div className="flex items-center justify-between">
          <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            リセットリンクを送信
          </button>
        </div>
      </form>
      {message && <p className="text-center text-green-600 mt-4">{message}</p>}
      <p className="text-center text-gray-500 text-xs mt-4">
        <Link href="/login" className="text-blue-500 hover:text-blue-800">ログインページに戻る</Link>
      </p>
    </div>
  );
}
