'use client';

import React, { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';

// ==========================================
// 💡 型定義（Interfaces）
// ==========================================
interface CookieConsentSettings {
  essential: boolean;
  performance: boolean;
  advertising: boolean;
}

export default function AnalyticsWrapper(): React.ReactElement | null {
  // ① settings の初期値は null、または CookieConsentSettings 構造体であることを明示
  const [settings, setSettings] = useState<CookieConsentSettings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // コンポーネントがマウントされたらlocalStorageを確認
    const saved = localStorage.getItem('cookie-consent-settings');
    const legacyLevel = localStorage.getItem('cookie-consent-level');

    if (saved) {
      try {
        // 詳細設定（オブジェクト形式）がある場合
        const parsed: CookieConsentSettings = JSON.parse(saved);
        setSettings(parsed);
      } catch (error) {
        console.error('Failed to parse cookie-consent-settings:', error);
      }
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