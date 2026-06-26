import React from 'react';
import { Metadata } from 'next'; // 💡 Metadata の型をインポート
import "./globals.css";
import Header from '@/components/Header';
import CategorySidebar from '@/components/CategorySidebar';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import DisclaimerBanner from '@/components/DisclaimerBanner';
import AnalyticsWrapper from '@/components/AnalyticsWrapper';
import CookieConsentBanner from '@/components/CookieConsentBanner';
import Footer from '@/components/Footer';
import { FilterProvider } from '@/context/FilterContext';

// 💡 metadata に型を適用して安全に管理
export const metadata: Metadata = {
  title: 'My EC Store',
  description: 'Next.js and Django EC Site',
};

// 💡 Props の型定義をインターフェースとして用意
interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps): React.ReactElement {
  return (
    <html lang="ja">
      {/* flex-col と min-h-screen でフッターを最下部に固定しやすく調整 */}
      <body className="flex flex-col min-h-screen">
        <AuthProvider>
          <CartProvider>
            <FilterProvider>
              {/* 免責事項バナー */}
              <DisclaimerBanner />
              
              {/* 共通ヘッダー */}
              <Header />
              
              {/* メインレイアウトコンテナ（サイドバー + メインコンテンツ） */}
              <div className="p-4 py-6 overflow-hidden flex flex-col overflow-x-hidden md:flex-row gap-6">
                {/* サイドバー（カテゴリ一覧） */}
                <div className="w-full md:w-64 flex-shrink-0">
                  <CategorySidebar />
                </div>
                
                {/* メインコンテンツエリア */}
                <main className="flex-grow min-w-0">
                  {children}
                </main>
              </div>
            </FilterProvider>
          </CartProvider>
        </AuthProvider>

        {/* 共通フッター */}
        <Footer />
        
        {/* Cookie同意に基づいて発火を制御するアナリティクス */}
        <AnalyticsWrapper />
        
        {/* プライバシーコンプライアンス（Cookie同意バナー） */}
        <CookieConsentBanner />
      </body>
    </html>
  );
}