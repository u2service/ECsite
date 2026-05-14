import "./globals.css";
import Header from '@/components/Header'; // Headerをインポート
import CategorySidebar from '@/components/CategorySidebar'; // 追加
import { AuthProvider } from '@/context/AuthContext'; // AuthProviderをインポート
import { CartProvider } from '@/context/CartContext'; // CartProviderをインポート

export const metadata = {
  title: 'My EC Store',
  description: 'Next.js and Django EC Site',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>
        <AuthProvider>
          <CartProvider>
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
      </body>
    </html>
  );
}
