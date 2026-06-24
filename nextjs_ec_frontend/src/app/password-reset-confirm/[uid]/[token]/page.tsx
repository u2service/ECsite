"use client";

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

// 💡 useParams() から取得できる動的ルートパラメータの型定義
interface RouteParams {
  uid: string;
  token: string;
  [key: string]: string | string[] | undefined;
}

export default function PasswordResetConfirmPage() {
  const [newPassword1, setNewPassword1] = useState<string>('');
  const [newPassword2, setNewPassword2] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  
  // 💡 useParams を定義した型でキャスト（または推論）
  const params = useParams<RouteParams>(); 
  const router = useRouter();
  const { fetchOptions } = useAuth();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  // 💡 フォーム送信イベントオブジェクトの型付け
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword1 !== newPassword2) {
      setError("パスワードが一致しません。");
      return;
    }

    const { uid, token } = params;
    
    // バックエンド（dj-rest-auth）に送信するリクエストボディ
    const body = { 
      uid, 
      token, 
      new_password1: newPassword1, 
      new_password2: newPassword2 
    };

    try {
      const res = await fetch(`${apiUrl}/api/auth/password/reset/confirm/`, fetchOptions('POST', body));
      if (res.ok) {
        setMessage("パスワードが正常にリセットされました。ログインページに移動します。");
        setTimeout(() => router.push('/login'), 3000);
      } else {
        const data = await res.json();
        setError(data.token ? data.token[0] : "無効なリンクです。再度リセットを申請してください。");
      }
    } catch (err) {
      console.error("Password reset confirmation error:", err);
      setError("エラーが発生しました。");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 px-4">
      <h1 className="text-2xl font-bold text-center mb-6 text-gray-900">新しいパスワードを設定</h1>
      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4 border border-gray-100">
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">新しいパスワード</label>
          <input
            type="password"
            value={newPassword1}
            // 💡 インプット変更イベントオブジェクトの型付け
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword1(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2">新しいパスワード（確認）</label>
          <input
            type="password"
            value={newPassword2}
            // 💡 インプット変更イベントオブジェクトの型付け
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword2(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
        <div className="flex items-center justify-center">
          <button 
            type="submit" 
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            パスワードをリセット
          </button>
        </div>
      </form>
      {message && <p className="text-center text-green-600 font-semibold mb-4">{message}</p>}
      {error && <p className="text-center text-red-500 font-semibold mb-4">{error}</p>}
    </div>
  );
}