// src/app/orders/page.jsx
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import { getFullImageUrl } from '@/utils/image';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { fetchOptions, user } = useAuth();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;
      try {
        const res = await fetch(`${apiUrl}/api/orders/`, fetchOptions('GET'));
        if (res.ok) {
          const data = await res.json();
          setOrders(data);
        }
      } catch (error) {
        console.error("注文履歴の取得に失敗しました", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [user]);

  if (loading) return <div className="text-center py-10">読み込み中...</div>;
  if (!user) return <div className="text-center py-10">ログインが必要です</div>;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">注文履歴</h1>
      {orders.length === 0 ? (
        <p className="text-gray-600">注文履歴はありません。</p>
      ) : (
        <div className="space-y-8">
          {orders.map((order) => (
            <div key={order.id} className="border rounded-xl overflow-hidden shadow-sm bg-white">
              <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  <p>注文日: {new Date(order.created_at).toLocaleDateString()}</p>
                  <p>注文ID: #{order.id}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">合計: ¥{Number(order.total_amount).toLocaleString()}</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-1 ${
                    order.status === 'paid' ? 'bg-green-100 text-green-800' :
                    order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {order.status_display}
                  </span>
                </div>
              </div>
              <div className="p-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center space-x-4 py-3 border-b last:border-0">
                    <div className="relative w-16 h-16 flex-shrink-0">
                      <Image
                        src={getFullImageUrl(item.product?.image)}
                        alt={item.product?.name || '商品不明'}
                        fill
                        className="object-cover rounded"
                      />
                    </div>
                    <div className="flex-grow">
                      <p className="font-semibold">{item.product?.name || '削除された商品'}</p>
                      <p className="text-sm text-gray-600">数量: {item.quantity} / 価格: ¥{Number(item.product?.price || 0).toLocaleString()}</p>
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
