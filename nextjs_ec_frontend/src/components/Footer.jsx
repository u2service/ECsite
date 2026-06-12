'use client';

import Link from 'next/link';

export default function Footer() {
  const handleResetConsent = () => {
    if (confirm('Cookieの設定をリセットして、再度選択し直しますか？')) {
      localStorage.removeItem('cookie-consent-level');
      window.location.reload();
    }
  };

  return (
    <footer className="bg-gray-100 border-t border-gray-200 mt-12 py-8">
      <div className="container mx-auto px-4 text-center">
        <p className="text-gray-600 text-sm mb-4">
          &copy; {new Date().getFullYear()} My EC Store. All rights reserved.
        </p>
        <div className="flex justify-center flex-wrap gap-4 md:gap-6">
          <Link href="/privacy-policy" className="text-xs text-gray-400 hover:text-gray-600 underline">プライバシーポリシー</Link>
          <Link href="/cookie-policy" className="text-xs text-gray-400 hover:text-gray-600 underline">Cookieポリシー</Link>

          <button
            onClick={handleResetConsent}
            className="text-xs text-gray-400 hover:text-gray-600 underline transition-colors"
          >
            Cookie設定をやり直す
          </button>
          {/* 他のリンクが必要な場合はここに追加できます */}
          {/* <Link href="/privacy-policy" className="text-xs text-gray-400 hover:text-gray-600 underline">プライバシーポリシー</Link> */}
        </div>
      </div>
    </footer>
  );
}

