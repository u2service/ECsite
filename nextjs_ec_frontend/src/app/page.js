// import ProductCard from '@/components/ProductCard'; // ProductCardをインポート
// import ProductListClient from '@/components/ProductListClient'; // あとで作ります

// // 商品データを取得するための非同期関数
// // 引数に q (検索ワード) を追加
// async function getProducts(q = '') {
//   let url = `${process.env.NEXT_PUBLIC_API_URL}/api/products/`;
//   if (q) {
//     url += `?q=${encodeURIComponent(q)}`;
//   }

//   const res = await fetch(url, { cache: 'no-store' }); // 検索結果はキャッシュさせない

//   // エラーハンドリング
//   if (!res.ok) {
//     throw new Error('Failed to fetch data');
//   }

//   return res.json();
// }

// export default async function Home({ searchParams }) {
//   // searchParams を受け取って検索クエリを取得
//   const resolvedParams = await searchParams;
//   const query = resolvedParams.q || '';

//   // ページがレンダリングされる前にサーバーサイドでデータを取得
//   const products = await getProducts(query);

//   return (
//     <div>
//       <h1 className="text-3xl font-bold mb-6">
//         {query ? `「${query}」の検索結果` : '商品一覧'}
//       </h1>
//       {/* データをクライアントコンポーネントに託す */}
//       <ProductListClient products={products} />
//     </div>
//   );
// }

// 商品データを取得するための非同期関数
async function getProducts() {
  // Django APIのエンドポイントにリクエストを送る
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products/`);

  // エラーハンドリング
  if (!res.ok) {
    throw new Error('Failed to fetch data');
  }

  return res.json();
}

export default async function Home() {
  // ページがレンダリングされる前にサーバーサイドでデータを取得
  const products = await getProducts();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">商品一覧</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <div key={product.id} className="border rounded-lg p-4">
            <h2 className="text-xl font-semibold">{product.name}</h2>
            <p className="text-gray-600">{product.price}円</p>
          </div>
        ))}
      </div>
    </div>
  );
}