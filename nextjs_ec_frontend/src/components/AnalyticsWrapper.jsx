'use client';

import { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';

export default function AnalyticsWrapper() {
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // コンポーネントがマウントされたらlocalStorageを確認
    const saved = localStorage.getItem('cookie-consent-settings');
    const legacyLevel = localStorage.getItem('cookie-consent-level');

    if (saved) {
      // 詳細設定（オブジェクト形式）がある場合
      setSettings(JSON.parse(saved));
    } else if (legacyLevel) {
      // 以前の簡易設定（文字列形式）がある場合の互換性維持
      setSettings({
        essential: true,
        performance: legacyLevel === 'all',
        advertising: legacyLevel === 'all'
      });
    }

    setIsLoading(false);
  }, []);

  // 読み込み中、または設定がまだない（未同意）場合は何も読み込まない
  if (isLoading || !settings) {
    return null;
  }

  return (
    <>
      {/* 2. パフォーマンス・アクセス解析 が許可されている場合のみ実行 */}
      {settings.performance && (
        <>
          <Analytics />
          {/* 他の解析ツール（例：Google Analytics）がある場合はここに追記 */}
          {/* <GoogleAnalytics gaId="G-XXXXXX" /> */}
        </>
      )}

      {/* 3. ターゲティング・広告 が許可されている場合のみ実行 */}
      {settings.advertising && (
        <>
          {/* 将来、広告用タグ（例：Google Ads, Meta Pixel）を使う場合はここに追記 */}
          {/* <MetaPixel /> */}
          {/* <GoogleAdsTag /> */}
        </>
      )}
    </>
  );
}
