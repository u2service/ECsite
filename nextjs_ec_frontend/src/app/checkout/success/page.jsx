"use client";

import { Suspense } from 'react';
import Link from 'next/link';
import { useEffect, useRef } from 'react'; // useRefを追加
import { useCart } from '@/context/CartContext';
import { useSearchParams } from 'next/navigation';

// 実際のコンテンツ部分
function SuccessContent() {
  const { clearCart } = useCart();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  
  // 2. 「重複実行の防止」のためのフラグ
  const hasCleared = useRef(false);

  useEffect(() => {
    // sessionId があり、かつ、まだクリア処理を行っていない場合のみ実行
    if (sessionId && !hasCleared.current) {
      console.log("Processing order for sessionId:", sessionId);
      
      clearCart();
      
      // 実行済みフラグを立てる
      hasCleared.current = true;
    }
  }, [sessionId, clearCart]);

  return (
    <div className="text-center py-20">
      <h1 className="text-3xl font-bold text-green-600">お支払いありがとうございました！</h1>
      <p className="mt-4">ご注文が正常に完了しました。注文確認メールをお送りしましたのでご確認ください。</p>
      <Link href="/" className="mt-8 inline-block bg-blue-600 text-white py-2 px-6 rounded hover:bg-blue-700">
        トップページに戻る
      </Link>
    </div>
  );
}

// ページコンポーネント本体
export default function CheckoutSuccessPage() {
  return (
    // useSearchParamsを使うコンポーネントをSuspenseで包む
    <Suspense fallback={<div className="text-center py-20">読み込み中...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
