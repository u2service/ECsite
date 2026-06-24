"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function ForgotPasswordPage() {
  const { fetchOptions } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    try {
      // 💡 dj-rest-auth の標準的なパスワードリセットエンドポイント
      const res = await fetch(
        `${apiUrl}/api/auth/password/reset/`,
        fetchOptions('POST', { email })
      );

      if (res.ok) {
        setIsSubmitted(true);
      } else {
        const errorData = await res.json();
        // バックエンドからのエラーメッセージがあれば表示、なければ汎用メッセージ
        setError(errorData.detail || errorData.email?.[0] || 'リクエストの送信に失敗しました。');
      }
    } catch (err) {
      console.error('Password reset error:', err);
      setError('通信エラーが発生しました。時間をおいて再度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white p-8 rounded-lg shadow-md border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          パスワードの再設定
        </h1>

        {isSubmitted ? (
          // 💡 送信成功画面
          <div className="text-center">
            <div className="text-green-500 text-5xl mb-4">✓</div>
            <p className="text-gray-700 mb-6 leading-relaxed">
              ご入力いただいたメールアドレス宛に、パスワード再設定用のリンクをお送りしました。メールをご確認ください。
            </p>
            <Link
              href="/login"
              className="inline-block w-full text-center bg-gray-100 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
            >
              ログイン画面に戻る
            </Link>
          </div>
        ) : (
          // 💡 入力フォーム画面
          <form onSubmit={handleSubmit} className="space-y-5">
            <p className="text-sm text-gray-600 leading-relaxed">
              登録されているメールアドレスを入力してください。パスワード再設定用のURLをお送りします。
            </p>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="example@domain.com"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {isLoading ? '送信中...' : '再設定メールを送信'}
            </button>

            <div className="text-center mt-4">
              <Link href="/login" className="text-sm text-blue-600 hover:underline">
                ログイン画面に戻る
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}