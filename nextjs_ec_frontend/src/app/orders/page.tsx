"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import { getFullImageUrl } from '@/utils/image';

// 💡 1. 自動生成されたスキーマから型をインポート
import { paths } from '@/types/schema';

// 💡 2. 注文一覧APIから「単一の注文オブジェクト」の型を抽出
type DjangoOrder = paths['/api/orders/']['get']['responses']['200']['content']['application/json'][number];

export default function OrdersPage() {
  const [orders, setOrders] = useState<DjangoOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // 💡 fetchOptions と一緒に、先ほど作った secureFetch を取り出す
  const { fetchOptions, secureFetch, user } = useAuth();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // 💡 通信キャンセルのためのコントローラーを用意
    const abortController = new AbortController();

    const fetchOrders = async () => {
      try {
        // 💡 secureFetch に signal を渡して紐付ける
        const res = await secureFetch(`${apiUrl}/api/orders/`, {
          ...fetchOptions('GET'),
          signal: abortController.signal
        });

        if (res.ok) {
          const data: DjangoOrder[] = await res.json();
          // 💡 画面がまだ存在している場合のみStateを更新
          if (!abortController.signal.aborted) {
            setOrders(data);
          }
        }
      } catch (error: any) {
        // 💡 意図的なキャンセル（画面遷移）以外のエラーのみログに出力
        if (error.name !== 'AbortError') {
          console.error("注文履歴の取得に失敗しました", error);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchOrders();

    // 💡 クリーンアップ関数で、アンマウント時に通信を安全に遮断
    return () => {
      abortController.abort();
    };
  }, [user, apiUrl, fetchOptions, secureFetch]);

  if (loading) return <div className="text-center py-10 text-gray-600">読み込み中...</div>;
  if (!user) return <div className="text-center py-10 text-gray-600">ログインが必要です</div>;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8 text-gray-900">注文履歴</h1>
      {orders.length === 0 ? (
        <p className="text-gray-600">注文履歴はありません。</p>
      ) : (
        <div className="space-y-8">
          {orders.map((order) => (
            <div key={order.id} className="border rounded-xl overflow-hidden shadow-sm bg-white border-gray-100">
              <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center">
                <div className="text-sm text-gray-600 space-y-1">
                  <p>注文日: {order.created_at ? new Date(order.created_at).toLocaleDateString() : '---'}</p>
                  <p>注文ID: #{order.id}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg text-gray-900">合計: ¥{Number(order.total_amount).toLocaleString()}</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-1 ${
                    order.status === 'paid' ? 'bg-green-100 text-green-800' :
                    order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {order.status_display || '処理中'}
                  </span>
                </div>
              </div>
              <div className="p-4">
                {order.items?.map((item) => (
                  <div key={item.id} className="flex items-center space-x-4 py-3 border-b border-gray-100 last:border-0">
                    <div className="relative w-16 h-16 flex-shrink-0">
                      <Image
                        src={getFullImageUrl(item.product?.image)}
                        alt={item.product?.name || '商品不明'}
                        fill
                        className="object-cover rounded"
                      />
                    </div>
                    <div className="flex-grow">
                      <p className="font-semibold text-gray-900">{item.product?.name || '削除された商品'}</p>
                      <p className="text-sm text-gray-600">
                        数量: {item.quantity} / 価格: ¥{Number(item.product?.price || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}