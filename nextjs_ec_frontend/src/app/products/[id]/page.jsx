import Link from 'next/link';
import ProductClientWrapper from '@/components/ProductClientWrapper'; // 後で作る

async function getProduct(id) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products/${id}/`, {
    next: 'no-store'
  });
  if (!res.ok) return null;
  return res.json();
}

// 追加: スペック定義を取得する関数
async function getSpecDefinitions(categoryId) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/category-specs/${categoryId}/`, {
    next: 'no-store'
  });
  if (!res.ok) return [];
  return res.json();
}

export default async function ProductPage({ params }) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) return <div className="text-center mt-10">商品が見つかりません。</div>;

  // 追加: スペック定義を取得
  const specDefinitions = await getSpecDefinitions(product.category.id);

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

      {/* 追加: スペック詳細テーブル */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b-2 border-gray-200">主な仕様</h2>
        <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <tbody className="bg-white divide-y divide-gray-200">
              {/* 基本情報: ブランド */}
              <tr>
                <th className="px-6 py-4 bg-gray-50 text-left text-sm font-medium text-gray-500 w-1/3">
                  メーカー（ブランド）
                </th>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {product.brand?.name || '-'}
                </td>
              </tr>
              {/* 基本情報: カテゴリ */}
              <tr>
                <th className="px-6 py-4 bg-gray-50 text-left text-sm font-medium text-gray-500">
                  カテゴリ
                </th>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {product.category?.name || '-'}
                </td>
              </tr>

              {/* 動的スペック項目 */}
              {specDefinitions.map((spec) => (
                <tr key={spec.name}>
                  <th className="px-6 py-4 bg-gray-50 text-left text-sm font-medium text-gray-500">
                    {spec.label}
                  </th>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {product.specifications && product.specifications[spec.name] !== undefined
                      ? String(product.specifications[spec.name])
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="mt-12">
        <Link href="/" className="text-blue-600 hover:underline flex items-center">
          <span className="mr-2">←</span> 商品一覧に戻る
        </Link>
      </div>
    </div>
  );
}
