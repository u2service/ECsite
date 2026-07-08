// app/checkout/cancel/CancelContent.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CancelContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');

  const [loading, setLoading] = useState(true);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [hasStock, setHasStock] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    const checkStatus = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${apiUrl}/api/checkout-status/?session_id=${sessionId}`, {
          method: 'GET',
        });

        if (!res.ok) {
          throw new Error('注文情報の取得に失敗しました。');
        }

        const data = await res.json();
        setOrderStatus(data.status);
        setHasStock(data.has_stock);
      } catch (err: any) {
        setError(err.message || '予期せぬエラーが発生しました。');
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-gray-600 animate-pulse">注文状態を確認中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-red-50 rounded-lg text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Link href="/" className="text-blue-600 hover:underline">トップページへ戻る</Link>
      </div>
    );
  }

  // 【パターンA】30分放置で時間切れ失効している場合
  if (orderStatus === 'expired') {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white border border-gray-200 rounded-xl shadow-sm text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">お支払い有効期限切れ</h1>
        <p className="text-gray-600 mb-6 leading-relaxed">
          決済手続きが開始されてから30分以上経過したため、ご注文の仮押さえは自動的にキャンセルされました。
        </p>

        {hasStock ? (
          <div className="bg-green-50 p-4 rounded-lg mb-6">
            <p className="text-green-800 text-sm mb-3">➔ 商品の在庫はまだ残っています！</p>
            <button
              onClick={() => router.push('/cart')}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
            >
              カートに戻って再度手続きする
            </button>
          </div>
        ) : (
          <div className="bg-amber-50 p-4 rounded-lg mb-6">
            <p className="text-amber-800 text-sm">
              申し訳ありません。仮押さえが解除された直後、別のお客様が購入されたため、現在は売り切れとなっています。
            </p>
          </div>
        )}
        <Link href="/" className="text-gray-500 hover:underline text-sm">お買い物を続ける</Link>
      </div>
    );
  }

  // 【パターンB】ユーザーが決済画面の「戻る」を自ら押して戻ってきた場合
  return (
    <div className="max-w-xl mx-auto my-12 p-8 bg-white border border-gray-200 rounded-xl shadow-sm text-center">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">決済がキャンセルされました</h1>
      <p className="text-gray-600 mb-6">
        Stripe決済画面で「戻る」が選択されたため、お支払いは行われませんでした。
      </p>
      <div className="flex justify-center gap-4">
        <Link href="/cart" className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">
          カートを見る
        </Link>
        <Link href="/" className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
          トップへ戻る
        </Link>
      </div>
    </div>
  );
}