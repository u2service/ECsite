import ProductCard from '@/components/ProductCard'; // ProductCardをインポート
import ProductListClient from '@/components/ProductListClient'; // あとで作ります

// 商品データを取得するための非同期関数
// 引数に q (検索ワード) を追加
async function getProducts(q = '') {
  let url = `${process.env.NEXT_PUBLIC_API_URL}/api/products/`;
  if (q) {
    url += `?q=${encodeURIComponent(q)}`;
  }

  // 💡 安全対策：環境変数が万が一設定されていない場合のフォールバック（二重の安全策）
  if (!process.env.NEXT_PUBLIC_API_URL) {
    console.warn("【警告】NEXT_PUBLIC_API_URL が未定義です。空の配列を返します。");
    return [];
  }

  // 接続エラー（Djangoがまだ起動していない等）でビルドを落とさないために try-catch で囲む
  try {
    const res = await fetch(url, { cache: 'no-store' }); // 検索結果はキャッシュさせない

    // エラーハンドリング
    if (!res.ok) {
        console.error(`Djangoサーバーからエラーが返されました (Status: ${res.status})`);
        return []; // 安全のために空の配列を返す
      }

      return await res.json();
  } catch (error) {
    // 💡 Vercelのビルド時は必ずここを通ります
    console.warn("【ビルド時警告】Djangoへの接続に失敗しました。本番起動後に通信可能になります:", error.message);
    return []; // クラッシュさせずに空の配列を返すことで、Next.jsにビルドを通過させます
  }
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
