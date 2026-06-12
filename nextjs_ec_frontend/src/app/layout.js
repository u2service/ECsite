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
              <div className="container mx-auto p-4 flex flex-col md:flex-row gap-6">
                {/* サイドバーを配置 */}
                <div className="w-full md:w-64 flex-shrink-0">
                  <CategorySidebar />
                </div>
                {/* メインコンテンツ */}
              <main className="flex-grow">
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
