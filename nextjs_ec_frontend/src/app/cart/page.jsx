"use client";

import { useCart } from '@/context/CartContext';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext'; // AuthContextをインポート
import { loadStripe } from '@stripe/stripe-js'; // stripe-jsをインポート
import { getFullImageUrl } from '@/utils/image'; // 追加

// Stripeの初期化（コンポーネントの外で一度だけ実行）
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export default function CartPage() {
  const { cart, loading, removeItemFromCart, updateItemQuantity } = useCart();
  const { fetchOptions } = useAuth(); // fetchOptionsを取得

  const handleCheckout = async () => {
    try {
      // 1. バックエンドにCheckout Sessionの作成をリクエスト
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/create-checkout-session/`, fetchOptions('POST'));
      const session = await res.json();

      if (res.ok) {
        // 2. バックエンドから取得したURLにリダイレクト
        if (session.url) {
          window.location.href = session.url;
        } else {
          console.error('Stripe Checkout URLがバックエンドから提供されていません。', session);
          alert('決済処理を開始できませんでした。');
        }
       } else {
        // バックエンドからのエラーレスポンスの構造をより詳細にログに記録
        console.error('Checkout Sessionの作成に失敗:', session); // sessionオブジェクト全体をログに出力
        // または、特定のプロパティをチェックして表示
        const errorMessage = session?.error || session?.detail || JSON.stringify(session);
        console.error('詳細:', errorMessage);
        alert(`決済処理を開始できませんでした。詳細: ${errorMessage}`);
      }
    } catch (error) {
      console.error('決済処理エラー:', error);
    }
  };

  if (loading) {
    return <div className="text-center">カートを読み込んでいます...</div>;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">カート</h1>
        <p>カートに商品がありません。</p>
        <Link href="/" className="text-blue-600 hover:underline mt-4 inline-block">
          お買い物を続ける
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">ショッピングカート</h1>
      <div className="bg-white shadow-md rounded-lg">
        {/* カートアイテムの一覧 */}
        {cart.items.map((item) => {
          // 独自のロジックを削除し、共通関数を使用
          const imageUrl = getFullImageUrl(item.product.image);

          return (
            <div key={item.id} className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center">
                {/* 画像表示エリア */}
                <div className="w-24 h-24 relative mr-4">
                  <Image
                    src={imageUrl}
                    alt={item.product.name}
                    fill // 親要素に合わせて表示
                    className="object-cover rounded"
                    priority // ← これを追加！
                  />
                </div>
                {/* 商品名と価格 */}
                <div>
                  <h2 className="font-semibold text-lg">{item.product.name}</h2>
                  <p className="text-gray-600">¥{Number(item.product.price).toLocaleString()}</p>
                </div>
              </div>

              {/* 数量変更と削除ボタン */}
              <div className="flex items-center">
                <div className="flex items-center border rounded">
                  <button
                    onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                    className="px-3 py-1 text-lg font-bold hover:bg-gray-100 transition-colors">-</button>
                  <span className="px-4 py-1">{item.quantity}</span>
                  <button
                    onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                    className="px-3 py-1 text-lg font-bold hover:bg-gray-100 transition-colors">+</button>
                </div>
                <button
                  onClick={() => removeItemFromCart(item.id)}
                  className="ml-4 text-red-500 hover:text-red-700 transition-colors">
                  削除
                </button>
              </div>
            </div>
          );
        })}

        {/* 合計金額表示 */}
        <div className="p-4 flex justify-end items-center">
          <span className="text-xl font-bold">合計金額:</span>
          <span className="text-2xl font-bold ml-4 text-red-600">
            ¥{Number(cart.grand_total).toLocaleString()}
          </span>
        </div>
      </div>

      {/* アクションボタン */}
      <div className="text-right mt-6">
        <button 
          onClick={handleCheckout} 
          className="mt-4 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded">
          レジに進む
        </button>
      </div>
    </div>
  );
}