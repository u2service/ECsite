import ProductCard from '@/components/ProductCard'; // ProductCardをインポート
import ProductListClient from '@/components/ProductListClient'; // あとで作ります

// 商品データを取得するための非同期関数
// 引数に q (検索ワード) を追加
async function getProducts(q = '') {
  let url = `${process.env.NEXT_PUBLIC_API_URL}/api/products/`;
  if (q) {
    url += `?q=${encodeURIComponent(q)}`;
  }

  const res = await fetch(url, { cache: 'no-store' }); // 検索結果はキャッシュさせない

  // エラーハンドリング
  if (!res.ok) {
    throw new Error('Failed to fetch data');
  }

  return res.json();
}

export default async function Home({ searchParams }) {
  // searchParams を受け取って検索クエリを取得
  const resolvedParams = await searchParams;
  const query = resolvedParams.q || '';

  // ページがレンダリングされる前にサーバーサイドでデータを取得
  const products = await getProducts(query);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">
        {query ? `「${query}」の検索結果` : '商品一覧'}
      </h1>
      {/* データをクライアントコンポーネントに託す */}
      <ProductListClient products={products} />
    </div>
  );
}
