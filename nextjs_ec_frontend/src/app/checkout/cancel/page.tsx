import Link from 'next/link';
import { Metadata } from 'next';

// 💡 ブラウザのタブ名や検索エンジン用のメタデータを定義
export const metadata: Metadata = {
  title: '決済キャンセル',
  robots: { index: false, follow: false }, // 決済画面系は検索エンジンにインデックスさせないのが一般的です
};

export default function CheckoutCancelPage() {
  return (
    <div className="text-center py-20">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">決済がキャンセルされました</h1>
        <p className="text-gray-600 mb-8">
          お支払いは完了していません。カートの中身は保持されていますので、いつでもお買い物を再開いただけます。
        </p>
        <div className="space-x-4">
          <Link 
            href="/cart" 
            className="inline-block bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors"
          >
            カートに戻る
          </Link>
          <Link 
            href="/" 
            className="inline-block bg-gray-200 text-gray-800 py-2 px-6 rounded-lg hover:bg-gray-300 transition-colors"
          >
            トップへ戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
