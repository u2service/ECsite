// src/app/categories/[id]/page.jsx
import Link from 'next/link';
import ProductClientWrapper from '@/components/ProductClientWrapper'; // 後で作る

async function getProduct(id) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products/${id}/`, {
    next: { revalidate: 60 } // 1分キャッシュするなど最適化が可能
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function ProductPage({ params }) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) return <div className="text-center mt-10">商品が見つかりません。</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* パンくずリストなどはSEOに重要なのでサーバー側で出す */}
      <nav className="flex text-sm text-gray-500 mb-6">
        <ol className="flex items-center space-x-2">
          <li><Link href="/" className="hover:text-blue-600">ホーム</Link></li>
          {product.category_path?.map((path) => (
            <li key={path.id} className="flex items-center space-x-2">
              <span>&gt;</span>
              <Link href={`/categories/${path.id}`} className="hover:text-blue-600">{path.name}</Link>
            </li>
          ))}
        </ol>
      </nav>

      {/* 動き（画像切り替え・カート追加）が必要な部分は子コンポーネントに任せる */}
      <ProductClientWrapper product={product} />

      <div className="mt-12">
        <Link href="/" className="text-blue-600 hover:underline flex items-center">
          <span className="mr-2">←</span> 商品一覧に戻る
        </Link>
      </div>
    </div>
  );
}
