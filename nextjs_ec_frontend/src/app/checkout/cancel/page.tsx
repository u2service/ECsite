// app/checkout/cancel/page.tsx
import { Metadata } from 'next';
import { Suspense } from 'react';
import CancelContent from './CancelContent';

// ⭕ メタデータは Server Component である page.tsx で安全に定義
export const metadata: Metadata = {
  title: '決済キャンセル',
  robots: { index: false, follow: false },
};

export default function CheckoutCancelPage() {
  return (
    // 💡 useSearchParams を使うコンポーネントは Suspense で囲むのが App Router の必須ルールです
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-gray-600 animate-pulse">読み込み中...</p>
      </div>
    }>
      <CancelContent />
    </Suspense>
  );
}