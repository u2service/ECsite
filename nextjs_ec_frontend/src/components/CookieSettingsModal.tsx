'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
// 💡 親のバナーコンポーネントから型定義をインポート
import { CookieConsentSettings } from './CookieConsentBanner';

// ==========================================
// 💡 Propsの型定義
// ==========================================
interface CookieSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: CookieConsentSettings) => void;
}

// ==========================================
// 📄 メインコンポーネント
// ==========================================
export default function CookieSettingsModal({ 
  isOpen, 
  onClose, 
  onSave 
}: CookieSettingsModalProps): React.ReactElement | null {
  
  // 初期状態のスイッチ設定（必須以外はOFF）
  const [settings, setSettings] = useState<CookieConsentSettings>({
    essential: true,      // 常に有効
    performance: false,   // 初期値OFF
    advertising: false,   // 初期値OFF
  });

  useEffect(() => {
    if (!isOpen) return;

    // 既に保存された設定があれば読み込む
    const saved = localStorage.getItem('cookie-consent-settings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved) as CookieConsentSettings);
      } catch (e) {
        console.error("Failed to parse cookie settings:", e);
      }
    }
  }, [isOpen]);

  // モーダルが閉じている状態なら何も描画しない
  if (!isOpen) return null;

  // 選択した設定を保存して閉じる
  const handleSave = (): void => {
    onSave(settings);
    onClose();
  };

  // クイックボタン：すべてをONにして保存して閉じる
  const handleAcceptAll = (): void => {
    const allOn: CookieConsentSettings = { essential: true, performance: true, advertising: true };
    setSettings(allOn);
    onSave(allOn);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white text-gray-900 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* ヘッダー */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-bold text-slate-900">Cookieの詳細設定</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 text-2xl focus:outline-none"
            aria-label="閉じる"
          >
            &times;
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-6 overflow-y-auto space-y-8">
          <p className="text-sm text-gray-600 leading-relaxed">
            当サイトでは、お客様の体験向上や適切な広告配信等のため、Cookieを使用しています。目的ごとにCookieの許可・拒否を管理いただけます。設定を選択して「設定を保存する」を押してください。
          </p>

          {/* 1. 必須Cookie */}
          <div className="flex items-start justify-between gap-4 p-4 border rounded-lg bg-gray-50">
            <div className="flex-grow">
              <h3 className="font-bold text-gray-900">1. 必須Cookie（常に有効）</h3>
              <p className="text-xs text-gray-600 mt-1">
                ログイン状態の維持、ショッピングカートの保持、CSRF対策などのセキュリティおよびサイトの基本機能の提供に不可欠なCookieです。この設定をオフにすることはできません。
              </p>
            </div>
            <div className="relative inline-block w-12 h-6 mt-1 flex-shrink-0">
              <input type="checkbox" checked readOnly className="sr-only peer" />
              <div className="w-full h-full bg-gray-300 rounded-full peer peer-checked:bg-blue-600 opacity-50 cursor-not-allowed"></div>
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform translate-x-6"></div>
            </div>
          </div>

          {/* 2. パフォーマンス・アクセス解析 */}
          <div className="flex items-start justify-between gap-4 p-4 border rounded-lg hover:border-blue-200 transition-colors">
            <div className="flex-grow">
              <h3 className="font-bold text-gray-900">2. パフォーマンス・アクセス解析（選択可能）</h3>
              <p className="text-xs text-gray-600 mt-1">
                訪問者数やトラフィックのソースをカウントし、サイトの利用状況を分析して改善するために使用します（例：Google Analytics）。拒否された場合、お客様の訪問データは計測されません。
              </p>
            </div>
            <label className="relative inline-block w-12 h-6 mt-1 cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                checked={settings.performance}
                onChange={(e) => setSettings({ ...settings, performance: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-full h-full bg-gray-300 rounded-full peer peer-checked:bg-blue-600 transition-colors"></div>
              <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.performance ? 'translate-x-6' : ''}`}></div>
            </label>
          </div>

          {/* 3. ターゲティング・広告 */}
          <div className="flex items-start justify-between gap-4 p-4 border rounded-lg hover:border-blue-200 transition-colors">
            <div className="flex-grow">
              <h3 className="font-bold text-gray-900">3. ターゲティング・広告（選択可能）</h3>
              <p className="text-xs text-gray-600 mt-1">
                お客様の興味・関心に合わせた最適な広告を配信するために使用します（例：Google広告、Metaピクセル）。拒否された場合、お客様への追跡型広告は配信されず、一般的な広告のみが表示されます。
              </p>
            </div>
            <label className="relative inline-block w-12 h-6 mt-1 cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                checked={settings.advertising}
                onChange={(e) => setSettings({ ...settings, advertising: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-full h-full bg-gray-300 rounded-full peer peer-checked:bg-blue-600 transition-colors"></div>
              <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.advertising ? 'translate-x-6' : ''}`}></div>
            </label>
          </div>

          <p className="text-[10px] text-gray-400 text-center">
            ※各Cookieの具体的な送信先事業者や詳細な目的については、「<Link href="/cookie-policy" className="underline hover:text-blue-600">Cookieポリシー</Link>」をご確認ください。
          </p>
        </div>

        {/* フッター */}
        <div className="px-6 py-4 border-t bg-gray-50 flex flex-col sm:flex-row gap-3 justify-end">
          <button
            onClick={handleSave}
            className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors focus:outline-none"
          >
            選択した設定を保存する
          </button>
          <button
            onClick={handleAcceptAll}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors focus:outline-none"
          >
            すべて同意する
          </button>
        </div>
      </div>
    </div>
  );
}