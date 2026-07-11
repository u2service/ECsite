"use client";

import { useState, useEffect, useMemo } from 'react';
import { useCart } from '@/context/CartContext';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { loadStripe } from '@stripe/stripe-js';
import { getFullImageUrl } from '@/utils/image';
// 💡 自動生成されたスキーマから必要な型をピンポイントで抽出
import { paths } from '@/types/schema';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation'; // ✨ 【追加】ルーターのインポート

// ① カートAPIのGETレスポンスから「カートアイテム」の型を抽出
type DjangoCart = paths['/api/cart/']['get']['responses']['200']['content']['application/json'][number];
type DjangoCartItem = DjangoCart['items'][number];

// ② 送料計算APIのGETレスポンスの型を抽出
type ShippingResponse = paths['/api/cart/calculate-shipping/']['get']['responses']['200']['content']['application/json'];

// ③ チェックアウトセッションAPIのPOSTレスポンスの型を抽出
type CheckoutResponse = paths['/api/create-checkout-session/']['post']['responses']['200']['content']['application/json'];


// Stripeの初期化
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

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
  // Context から取得する値
  const { cart, loading: cartLoading, removeItemFromCart, updateItemQuantity } = useCart() as any;
  const { user, loading: authLoading, secureFetch, fetchOptions } = useAuth();
  
  const router = useRouter(); // ✨ 【追加】ルーターの初期化

  const [selectedPrefecture, setSelectedPrefecture] = useState("");
  const [shippingTotal, setShippingTotal] = useState(0);
  const [isCalculating, setIsCalculating] = useState(false);

  // 商品合計金額の計算（cartが変更されたときだけ再計算）
  const itemsTotal = useMemo(() => {
    return cart ? Number(cart.grand_total) : 0;
  }, [cart?.grand_total]);

  // 未ログインユーザーを自動的にリダイレクトさせる処理
  useEffect(() => {
    // 認証情報の確認が完了し（authLoadingがfalse）、かつユーザーが存在しない場合
    if (!authLoading && !user) {
      toast.error("カートを表示するにはログインが必要です。");
      router.push('/login'); 
    }
  }, [user, authLoading, router]);

  // 都道府県が変更されたら送料を計算
  useEffect(() => {
    const abortController = new AbortController();

    const fetchShipping = async () => {
      // カートが空、または都道府県が未選択なら送料0でリターン
      if (!selectedPrefecture || itemsTotal === 0) {
        setShippingTotal(0);
        return;
      }

      setIsCalculating(true);
      try {
        const res = await secureFetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/cart/calculate-shipping/?prefecture=${encodeURIComponent(selectedPrefecture)}`,
          {
            ...fetchOptions('GET'),
            signal: abortController.signal
          }
        );
        if (res.ok) {
          const data: ShippingResponse = await res.json();
          setShippingTotal(data.shipping_total);
        } else {
          console.warn(`送料計算リクエストがステータス ${res.status} で返されました。`);
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('送料計算エラー:', error);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsCalculating(false);
        }
      }
    };

    fetchShipping();
    return () => {
      abortController.abort();
    };
  // 💡 依存配列を JSON.stringify から「都道府県」と「商品合計額」のプリミティブな値に変更
  }, [selectedPrefecture, itemsTotal, fetchOptions, secureFetch]);
  
  // クッキーからCSRFトークンを取得するヘルパー関数（関数の外か中に配置）
  const getCookie = (name: string) => {
    if (typeof document === 'undefined') return '';
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || '';
    return '';
  };

  const handleCheckout = async () => {
    if (!selectedPrefecture) {
      toast("配送先の都道府県を選択してください。")
      return;
    }

    try {
      // 1. クッキーからCSRFトークンを抽出
      const csrfToken = getCookie('csrftoken');

      // 2. fetchOptions のヘッダーに X-CSRFToken をマージする
      const options = fetchOptions('POST', { prefecture: selectedPrefecture });
      options.headers = {
        ...options.headers,
        'X-CSRFToken': csrfToken,
      };

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/create-checkout-session/`,
        options // 修正したoptionsを渡す
      );
      const session: CheckoutResponse = await res.json();

      if (res.ok) {
        if (session.url) {
          window.location.href = session.url;
        } else {
          console.error('Stripe Checkout URLがバックエンドから提供されていません。', session);
          toast.error('決済処理を開始できませんでした。')
        }
      } else {
        console.error('Checkout Sessionの作成に失敗:', session);
        const errorMessage = (session as any)?.error || (session as any)?.detail || JSON.stringify(session);
        toast.error(`決済処理を開始できませんでした。詳細: ${errorMessage}`)
      }
    } catch (error) {
      console.error('決済処理エラー:', error);
    }
  };

  // 💡 【修正】ガード処理の画面表示
  // 認証チェック中、または未ログイン（リダイレクトが走るまでの一瞬）は
  // 画面がフリーズしたと誤解されないよう、シンプルなローディング表示を返します。
  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 font-medium">読み込み中...</p>
      </div>
    );
  }

  if (cartLoading) {
    return <div className="text-center mt-10">カートを読み込んでいます...</div>;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="text-center mt-10">
        <h1 className="text-2xl font-bold mb-4">カート</h1>
        <p>カートに商品がありません。</p>
        <Link href="/" className="text-blue-600 hover:underline mt-4 inline-block">
          お買い物を続ける
        </Link>
      </div>
    );
  }

  const grandTotal = itemsTotal + shippingTotal;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">ショッピングカート</h1>
      <div className="bg-white shadow-md rounded-lg mb-6">
        {cart.items.map((item: DjangoCartItem) => {
          const imageUrl = getFullImageUrl(item.product.image);

          return (
            <div key={item.id} className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center">
                <div className="w-24 h-24 relative mr-4">
                  <Image
                    src={imageUrl}
                    alt={item.product.name}
                    fill
                    className="object-cover rounded"
                    priority
                  />
                </div>
                <div>
                  <h2 className="font-semibold text-lg">{item.product.name}</h2>
                  <p className="text-gray-600">¥{Number(item.product.price).toLocaleString()}</p>
                </div>
              </div>

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