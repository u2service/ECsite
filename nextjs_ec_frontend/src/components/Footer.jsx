'use client';

import Link from 'next/link';

export default function Footer() {
  const handleResetConsent = () => {
    // ユーザーに確認を求める
    if (confirm('Cookieの設定をリセットして、再度選択し直しますか？')) {
      // 古いキーと新しいキーの両方を削除
      localStorage.removeItem('cookie-consent-level');
      localStorage.removeItem('cookie-consent-settings');

      // ページを再読み込みして、バナーを最初から表示させる
      window.location.reload();
    }
  };

  return (
    <footer className="bg-gray-100 border-t border-gray-200 mt-12 py-8">
      <div className="container mx-auto px-4 text-center">
        <p className="text-gray-600 text-sm mb-4">
          &copy; {new Date().getFullYear()} My EC Store. All rights reserved.
        </p>

        <div className="flex flex-wrap justify-center gap-4 md:gap-8">
          <Link
            href="/privacy-policy"
            className="text-xs text-gray-500 hover:text-gray-800 underline transition-colors"
          >
            プライバシーポリシー
          </Link>

          <Link
            href="/cookie-policy"
            className="text-xs text-gray-500 hover:text-gray-800 underline transition-colors"
          >
            Cookieポリシー
          </Link>

          {/* Cookie設定のリセットボタン */}
          <button
            onClick={handleResetConsent}
            className="text-xs text-gray-400 hover:text-gray-600 underline transition-colors"
          >
            Cookie設定をやり直す
          </button>
        </div>
      </div>
    </footer>
  );
}
