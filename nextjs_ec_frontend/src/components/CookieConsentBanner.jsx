'use client'; // クライアントサイドで動作させるために必要

import { useState, useEffect } from 'react';

export default function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // ブラウザの保存領域を確認し、まだ同意していなければ表示する
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    // 同意したことをブラウザに記録し、バナーを閉じる
    localStorage.setItem('cookie-consent', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white p-4 z-[100] shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="text-sm">
        当サイトでは、サービスの向上、ログイン状態の保持、および分析のためにCookieを使用しています。
        サイトを継続して利用することで、Cookieの使用に同意したことになります。
      </div>
      <button
        onClick={handleAccept}
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded whitespace-nowrap"
      >
        同意する
      </button>
    </div>
  );
}
