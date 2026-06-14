"use client";
import ProductCard from './ProductCard';

export default function NewArrivals({ products }) {
  // 商品がない場合の表示
  if (!products || products.length === 0) {
    return (
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-4">新着商品</h2>
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg py-10 text-center">
          <p className="text-gray-500">新着商品はありません</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-12 w-full max-w-full overflow-hidden">
      <h2 className="text-2xl font-bold mb-6">新着商品</h2>
      {/* 横スクロールコンテナ */}
      <div className="flex overflow-x-auto pb-4 gap-6 snap-x snap-mandatory w-full scrollbar-thin
scrollbar-thumb-gray-300 scrollbar-track-transparent">
        {products.map((product) => (
          <div key={product.id} className="flex-none snap-start">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </div>
  );
}
