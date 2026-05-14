// src/app/password-reset-confirm/[uid]/[token]/page.jsx
"use client";

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function PasswordResetConfirmPage() {
  const [newPassword1, setNewPassword1] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const params = useParams(); // URLからuidとtokenを取得
  const router = useRouter();
  const { fetchOptions } = useAuth();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword1 !== newPassword2) {
      setError("パスワードが一致しません。");
      return;
    }

    const { uid, token } = params;
    const body = { uid, token, new_password1: newPassword1, new_password2: newPassword2 };

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
      setError("エラーが発生しました。");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <h1 className="text-2xl font-bold text-center mb-6">新しいパスワードを設定</h1>
      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">新しいパスワード</label>
          <input
            type="password"
            value={newPassword1}
            onChange={(e) => setNewPassword1(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3"
            required
          />
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2">新しいパスワード（確認）</label>
          <input
            type="password"
            value={newPassword2}
            onChange={(e) => setNewPassword2(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3"
            required
          />
        </div>
        <div className="flex items-center justify-center">
          <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            パスワードをリセット
          </button>
        </div>
      </form>
      {message && <p className="text-center text-green-600">{message}</p>}
      {error && <p className="text-center text-red-500">{error}</p>}
    </div>
  );
}
