// src/components/ProductClientWrapper.jsx
"use client";

import { useState, useRef } from 'react';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { getFullImageUrl } from '@/utils/image';

export default function ProductClientWrapper({ product }) {
  const [selectedImage, setSelectedImage] = useState(product.image);
  const { addItemToCart } = useCart();

  // ズーム用のステート
  const [zoomStyle, setZoomStyle] = useState({ display: 'none', backgroundPosition: '0% 0%' });
  const containerRef = useRef(null);

  // マウス移動時の処理
  const handleMouseMove = (e) => {
    const { left, top, width, height } = containerRef.current.getBoundingClientRect();
    const x = ((e.pageX - left - window.scrollX) / width) * 100;
    const y = ((e.pageY - top - window.scrollY) / height) * 100;

    setZoomStyle({
      display: 'block',
      backgroundPosition: `${x}% ${y}%`,
      backgroundImage: `url(${getFullImageUrl(selectedImage)})`,
    });
  };

  const handleMouseLeave = () => {
    setZoomStyle({ ...zoomStyle, display: 'none' });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
      {/* 画像エリア */}
      <div className="relative">

        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}

          className="relative aspect-square w-full rounded-lg overflow-hidden cursor-crosshair border border-gray-100"
        >
          <Image
            src={getFullImageUrl(selectedImage)}
            alt={product.name}
            fill
            className="object-contain"
            priority
          />
        </div>
        {/* サムネイル一覧 (既存のロジックをここに移植) */}
        <div className="grid grid-cols-5 gap-2 mt-4">
           {/* ... (既存のmap処理) ... */}
            <div
              className={`relative aspect-square cursor-pointer border-2 ${selectedImage === product.image ? 'border-blue-500' : 'border-transparent'}`}
              onClick={() => setSelectedImage(product.image)}
            >
              <Image
                src={getFullImageUrl(product.image)}
                fill
                className="object-cover"
                alt="thumbnail"
              />
            </div>

        {/* 拡大画像表示エリア（右側に絶対配置） */}
        <div
          style={{
            ...zoomStyle,
            backgroundSize: '250%', // 2.5倍に拡大
            backgroundRepeat: 'no-repeat',
          }}
          className="hidden md:block absolute top-0 left-full ml-4 w-full aspect-square z-40 bg-white border shadow-2xl rounded-lg overflow-hidden pointer-events-none"
        >
          {/* ここに背景画像として拡大されたものが表示される */}

            {/* product.images が存在し、かつ配列である場合のみ map を実行する */}
            {product.images && Array.isArray(product.images) && product.images.length > 0 ? (
              product.images.map((img) => (
                <div
                  key={img.id}
                  className={`relative aspect-square cursor-pointer border-2 ${selectedImage === img.image ? 'border-blue-500' : 'border-transparent'}`}
                  onClick={() => setSelectedImage(img.image)}
                >
                  <Image
                    src={getFullImageUrl(img.image)}
                    alt={img.alt_text || "thumbnail"}
                    fill
                    className="object-cover"
                  />
                </div>
              ))
            ) : (
              // 画像がない場合のフォールバック（または何も表示しない）
              <p className="text-sm text-gray-500">追加の画像はありません</p>
            )}
        </div>
      </div>

      {/* 商品情報・ボタン */}
      <div className="flex flex-col justify-center">
        <h1 className="text-3xl font-bold mb-4">{product.name}</h1>

        {/* 在庫状況の表示 */}
          {product.stock > 0 ? (
            <p className="text-green-600 font-semibold mb-2">在庫あり（残り {product.stock} 点）</p>
          ) : (
            <p className="text-red-600 font-bold mb-2">申し訳ありません、現在売り切れです</p>
          )}

        <p className="text-gray-600 text-lg mb-6 leading-relaxed whitespace-pre-wrap">{product.description}</p>

        <p className="text-4xl font-bold text-red-600 mb-8">¥{Number(product.price).toLocaleString()}</p>
        <button
          onClick={() => addItemToCart(product.id, 1)}
          disabled={product.stock === 0}
          className={`w-full py-4 rounded-xl text-xl font-semibold transition-all shadow-lg ${
            product.stock > 0 
                ? "bg-blue-600 text-white hover:bg-blue-700 active:scale-95" 
                : "bg-gray-400 text-gray-200 cursor-not-allowed"
          }`}
        >
          {product.stock > 0 ? "カートに入れる" : "売り切れ"}
        </button>
      </div>
    </div>
  );
}
