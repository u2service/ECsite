import "./globals.css";
import Header from '@/components/Header'; // Headerをインポート
import CategorySidebar from '@/components/CategorySidebar'; // 追加
import { AuthProvider } from '@/context/AuthContext'; // AuthProviderをインポート
import { CartProvider } from '@/context/CartContext'; // CartProviderをインポート
import DisclaimerBanner from '@/components/DisclaimerBanner';
import { Analytics } from '@vercel/analytics/react';
import AnalyticsWrapper from '@/components/AnalyticsWrapper';
import CookieConsentBanner from '@/components/CookieConsentBanner';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'My EC Store',
  description: 'Next.js and Django EC Site',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body className="flex flex-col min-h-screen"> {/* flex-col と min-h-screen を追加してフッターを下に固定しやすくする */}
        <AuthProvider>
          <CartProvider>
              {/* ここにバナーを追加 */}
              <DisclaimerBanner />
              <Header /> {/* ここにHeaderを配置 */}
              <div className="p-4 py-6 overflow-hidden flex flex-col overflow-x-hidden md:flex-row gap-6">
                {/* サイドバーを配置 */}
                <div className="w-full md:w-64 flex-shrink-0">
                  <CategorySidebar />
                </div>
                {/* メインコンテンツ */}
              <main className="flex-grow min-w-0">
                {children}
              </main>
            </div>
          </CartProvider>
        </AuthProvider>
        <Footer /> {/* ここにFooterを追加 */}
        {/* 直接 Analytics を置くのではなく、Wrapperで制御する */}
        <AnalyticsWrapper />
        <CookieConsentBanner />
      </body>
    </html>
  );
}
