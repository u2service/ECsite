"use client";

import { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext'; // AuthContextをインポート
import { loadStripe } from '@stripe/stripe-js'; // stripe-jsをインポート
import { getFullImageUrl } from '@/utils/image'; // 追加

// Stripeの初期化（コンポーネントの外で一度だけ実行）
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

// 都道府県リスト
const PREFECTURES = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
  "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
  "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
  "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"
];

export default function CartPage() {
  const { cart, loading, removeItemFromCart, updateItemQuantity } = useCart();
  const { fetchOptions } = useAuth(); // fetchOptionsを取得

  // 新しく追加するステート
  const [selectedPrefecture, setSelectedPrefecture] = useState("");
  const [shippingTotal, setShippingTotal] = useState(0);
  const [isCalculating, setIsCalculating] = useState(false);

  // 都道府県が変更されたら送料を計算
  useEffect(() => {
    const fetchShipping = async () => {
      if (!selectedPrefecture) {
        setShippingTotal(0);
        return;
      }

      setIsCalculating(true);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/cart/calculate-shipping/?prefecture=${selectedPrefecture}`,
          fetchOptions('GET')
        );
        const data = await res.json();
        if (res.ok) {
          setShippingTotal(data.shipping_total);
        }
      } catch (error) {
        console.error('送料計算エラー:', error);
      } finally {
        setIsCalculating(false);
      }
    };

    fetchShipping();
  }, [selectedPrefecture, cart, fetchOptions]);

  const handleCheckout = async () => {
    if (!selectedPrefecture) {
      alert("配送先の都道府県を選択してください。");
      return;
    }

    try {
            // 修正ポイント: fetchOptionsの第2引数にデータを渡す
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/create-checkout-session/`,
        fetchOptions('POST', { prefecture: selectedPrefecture })
      );
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

  const itemsTotal = Number(cart.grand_total);
  const grandTotal = itemsTotal + shippingTotal;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">ショッピングカート</h1>
      <div className="bg-white shadow-md rounded-lg mb-6">
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
      </div>


      {/* 配送先選択と合計金額 */}
      <div className="bg-gray-50 p-6 rounded-lg shadow-inner">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="w-full md:w-1/2">
            <label className="block text-sm font-bold text-gray-700 mb-2">配送先の都道府県</label>
            <select
              value={selectedPrefecture}
              onChange={(e) => setSelectedPrefecture(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">-- 都道府県を選択してください --</option>
              {PREFECTURES.map(pref => (
                <option key={pref} value={pref}>{pref}</option>
              ))}
            </select>
            <p className="mt-2 text-xs text-gray-500">※配送先によって送料が異なります。</p>
          </div>

          <div className="w-full md:w-1/3 text-right space-y-2 border-t md:border-t-0 pt-4 md:pt-0">
            <div className="flex justify-between text-gray-600">
              <span>商品合計:</span>
              <span className="font-medium">¥{itemsTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>送料:</span>
              <span className="font-medium">{isCalculating ? "計算中..." : `¥${shippingTotal.toLocaleString()}`}</span>
            </div>
            <div className="flex justify-between text-xl font-bold pt-2 border-t border-gray-300">
              <span>総支払額:</span>
              <span className="text-red-600">¥{grandTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* アクションボタン */}
      <div className="text-right mt-6">
        <button 
          onClick={handleCheckout} 
          disabled={!selectedPrefecture || isCalculating}
          className={`font-bold py-3 px-8 rounded-lg text-white transition-all shadow-md ${
            !selectedPrefecture || isCalculating
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-green-500 hover:bg-green-600 active:scale-95"
          }`}>
          {isCalculating ? "送料計算中..." : "レジに進む"}
        </button>
      </div>
    </div>
  );
}