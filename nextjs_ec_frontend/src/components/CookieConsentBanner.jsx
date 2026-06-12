'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 同意状態を確認
    const consent = localStorage.getItem('cookie-consent-level');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  // すべてを受け入れる
  const handleAcceptAll = () => {
    localStorage.setItem('cookie-consent-level', 'all');
    setIsVisible(false);
  };

  // 必須のみ許可（拒否）
  const handleEssentialOnly = () => {
    localStorage.setItem('cookie-consent-level', 'essential');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-6 z-[100] shadow-[0_-4px_20px_rgba(0,0,0,0.3)] border-t border-gray-700">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-lg font-bold mb-3">Cookie（クッキー）の利用について</h2>

        <div className="text-sm text-gray-300 mb-6 leading-relaxed">
          当サイトでは、お客様の利便性向上、アクセス解析、および最適な広告配信のためにCookieを使用しています。
          また、これらの情報を広告・分析パートナーと共有することがあります。
          <br />
          <span className="text-gray-400 text-xs mt-2 inline-block">
            ※サイトの動作に必須のCookie（ログイン状態の維持やセキュリティ対策）は常時使用されます。
          </span>
          <br />
          詳細については、当社の
          <Link href="/cookie-policy" className="underline hover:text-blue-400 mx-1">Cookieポリシー</Link>
          および
          <Link href="/privacy-policy" className="underline hover:text-blue-400 mx-1">プライバシーポリシー</Link>
          をご覧ください。
        </div>

        <div className="flex flex-wrap gap-3 justify-end items-center">
          {/* 詳細設定：ここではポリシーページへの遷移としています */}
          <Link
            href="/privacy-policy#settings"
            className="text-sm text-gray-400 hover:text-white underline mr-4"
          >
            詳細設定
          </Link>

          {/* 必須のみ許可（拒否） */}
          <button
            onClick={handleEssentialOnly}
            className="border border-gray-500 hover:bg-gray-700 text-white text-sm font-medium py-2 px-4 rounded transition-colors"
          >
            必須Cookieのみ許可（拒否）
          </button>

          {/* すべてを受け入れる */}
          <button
            onClick={handleAcceptAll}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 px-6 rounded transition-colors"
          >
            すべてのCookieを受け入れる
          </button>
        </div>
      </div>
    </div>
  );
}
