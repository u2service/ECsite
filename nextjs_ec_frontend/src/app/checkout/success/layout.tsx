import { Metadata } from 'next';
import { ReactNode } from 'react';

// 💡 サーバーコンポーネントである layout.tsx 側でメタデータを定義します
export const metadata: Metadata = {
  title: 'ご注文完了',
  robots: { index: false, follow: false }, // 検索エンジンに登録させない
};

export default function SuccessLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}