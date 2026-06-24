"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

// 1. ログインフォームのメインロジック
function LoginFormContent() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [timeoutMessage, setTimeoutMessage] = useState<string>('');
  const { loginUser } = useAuth();
  const searchParams = useSearchParams();

  useEffect(() => {
    // URLに ?timeout=true が含まれている場合にメッセージを表示
    // 💡 先ほど仕込んだ AuthContext の handleSessionTimeout からここへリダイレクトされます！
    if (searchParams.get('timeout') === 'true') {
      setTimeoutMessage('タイムアウトによりログアウトされました。再度ログインしてください。');
    }
  }, [searchParams]);

  // 💡 フォーム送信イベントオブジェクトの型付け
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    loginUser(email, password);
  };

  return (
    <div className="max-w-md mx-auto mt-10 px-4">
      <h1 className="text-2xl font-bold text-center mb-6 text-gray-900">ログイン</h1>

      {/* タイムアウトメッセージ */}
      {timeoutMessage && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4 text-center text-sm font-semibold">
          {timeoutMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4 border border-gray-100">
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
            メールアドレス
          </label>
          <input
            type="email"
            id="email"
            value={email}
            // 💡 インプット変更イベントオブジェクトの型付け
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="example@mail.com"
            required
          />
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
            パスワード
          </label>
          <input
            type="password"
            id="password"
            value={password}
            // 💡 インプット変更イベントオブジェクトの型付け
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
        <div className="flex items-center justify-between">
          <button 
            type="submit" 
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            ログイン
          </button>
          <Link 
            href="/forgot-password" 
            className="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800 transition-colors"
          >
            パスワードをお忘れですか？
          </Link>
        </div>
      </form>
      <p className="text-center text-gray-500 text-xs">
        アカウントがありませんか？{' '}
        <Link href="/signup" className="text-blue-500 hover:text-blue-800 font-semibold underline">
          会員登録
        </Link>
      </p>
    </div>
  );
}

// 2. Suspenseで囲んだエクスポート（Next.jsのルール）
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center mt-10 text-gray-600">読み込み中...</div>}>
      <LoginFormContent />
    </Suspense>
  );
}