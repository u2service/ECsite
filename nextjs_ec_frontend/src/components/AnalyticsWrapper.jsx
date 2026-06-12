'use client';

import { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';

export default function AnalyticsWrapper() {
  const [consentLevel, setConsentLevel] = useState(null);

  useEffect(() => {
    // コンポーネントがマウントされたらlocalStorageを確認
    const level = localStorage.getItem('cookie-consent-level');
    setConsentLevel(level);

    // CookieConsentBannerでのボタン操作を検知するためのイベントリスナー（任意）
    // シンプルにするなら、ページ遷移のたびに再評価されます
  }, []);

  // 「すべて許可」の場合のみAnalyticsや広告を動かす
  if (consentLevel !== 'all') {
    return null;
  }

  return (
    <>
      <Analytics />
      {/* 将来、広告用Cookie（Google Adsなど）を使う場合はここに追記するだけで一括制御できます */}
      {/* <GoogleTagManager gtmId="GTM-XXXX" /> */}
    </>
  );
}
