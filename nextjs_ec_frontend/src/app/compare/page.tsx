import { Product, SpecDefinition, BrandDefinition } from '../../types/product';
import Image from 'next/image';
import { getFullImageUrl } from '@/utils/image'; // 追加
import Link from 'next/link';

// 1. 商品データを取得する関数
async function fetchProducts(ids: string[]): Promise<Product[]> {
  const idQuery = ids.join(',');
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
  const url = `${API_BASE}/api/products/compare/?ids=${idQuery}`;
  console.log("Djangoにリクエスト送信中:", url); // ターミナルに表示されます

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      console.error("Djangoがエラーを返しました:", res.status);
      return [];
    }
    const data = await res.json();
    console.log("取得したデータ:", data); // これが空でないか確認
    return data;
  } catch (error) {
    console.error("通信自体に失敗しました（CORSやサーバー停止など）:", error);
    return [];
  }
}

// 2. カテゴリ項目定義を取得する関数
async function fetchSpecDefinitions(categoryId: number): Promise<SpecDefinition[]> {
  // 商品取得と同じ環境変数を指定（なければローカルの 8000 を使う）
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
  const res = await fetch(`${API_BASE}/api/category-specs/${categoryId}/`, {
    cache: 'no-store',
  });
  if (!res.ok) return [];
  return res.json();
}

type Props = {
  searchParams: Promise<{ ids?: string }>;
};

// 3. ページ本体
// 比較ページの page.jsx のイメージ
export default async function ComparePage({ searchParams }: Props) {
  const { ids } = await searchParams;
  const params = await searchParams;
  const idsString = params.ids || ""; // "1,2,3" という文字列
  const idArray = idsString.split(',').filter(id => id !== "");
  
  if (!idsString) {
    return <div className="p-10 text-red-500">比較する商品が選択されていません。</div>;
  }

  const productIds = idsString.split(',');
  const products = await fetchProducts(productIds);

  if (products.length === 0) {
    return <div className="p-10">該当する商品が見つかりませんでした。</div>;
  }

  const categoryId = products[0].category.id; // ここでエラーが出ていた箇所
  console.log("リクエストするカテゴリID:", categoryId); // IDが正しいか確認

  const specDefinitions = await fetchSpecDefinitions(categoryId);

  const brandId = products[0].brand;
  console.log("メーカー（ブランド）は", brandId)

  console.log("取得したスペック定義:", specDefinitions); // ここが [] ならDBまたはAPIの問題
  console.log("スペック定義の1つ目:", specDefinitions[0]?.name);
  console.log("商品1のスペック全データ:", products[0]?.specifications);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">商品性能比較</h1>
      <div className="overflow-x-auto shadow-md rounded-lg">
        <table className="w-full text-left border-collapse bg-white">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-4 border-b font-semibold w-40 sticky left-0 bg-gray-100">ID</th>
              {products.map((p) => (
                <th key={p.id} className="p-4 border-b font-semibold min-w-[200px]">{p.id}</th>
              ))}
            </tr>

            <tr>
              <th className="p-4 border-b font-semibold w-40 sticky left-0 bg-gray-100">カテゴリ</th>
              {products.map((p) => (
                <th key={p.id} className="p-4 border-b font-semibold min-w-[200px]">{p.category.name}</th>
              ))}
            </tr>

            {/* メーカー（ブランド） */}
            <tr>
              <th className="p-4 border-b font-semibold w-40 sticky left-0 bg-gray-100">メーカー（ブランド）</th>
              {products.map((p) => (
                <th key={p.id} className="p-4 border-b font-semibold min-w-[200px]">
                  {/* p.brand がオブジェクトになったので .name を指定 */}
                  {p.brand?.name || "不明"}
                </th>
              ))}
            </tr>

            <tr>
              <th className="p-4 border-b font-semibold w-40 sticky left-0 bg-gray-100">品名</th>
              {products.map((p) => (
                <th key={p.id} className="p-4 border-b font-semibold min-w-[200px]">
                  <Link
                    href={`/products/${p.id}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline decoration-2 transition-all"
                  >
                  {p.name}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* 価格行 */}
            <tr>
              <td className="p-4 border-b font-medium sticky left-0 bg-gray-50">価格</td>
              {products.map((p) => (
                <td key={p.id} className="p-4 border-b">¥{Number(p.price).toLocaleString()}</td>
              ))}
            </tr>

            {/* 画像 */}
            <tr>
              <td className="p-4 border-b font-medium sticky left-0 bg-gray-50">画像</td>
              {products.map((p) => (
                <td key={p.id} className="p-4 border-b">
                  <div className="relative w-20 h-20">
                    <Image
                      src={getFullImageUrl(p.image)} // ここでエラーが消えるはず！
                      alt={p.name}
                      fill
                      className="object-cover rounded"
                    />
                  </div>
                </td>
              ))}
            </tr>

            {/* 説明行 */}
            <tr>
              <td className="p-4 border-b font-medium sticky left-0 bg-gray-50">説明</td>
              {products.map((p) => (
                <td key={p.id}>{p.description}</td>
              ))}
            </tr>

            {/* スペック詳細のセクション見出し（ここが見出しになります） */}
            <tr className="bg-gray-200">
              <td colSpan={products.length + 1} className="p-2 font-bold text-center border-b">
                スペック詳細
              </td>
            </tr>

            {/* 各スペック項目をループで回す（外側の tr は不要です） */}
            {specDefinitions.map((spec) => (
              <tr key={spec.name} className="hover:bg-gray-50">
                <td className="p-4 border-b font-medium sticky left-0 bg-gray-50">{spec.label}</td>

                {/* 各商品の値 */}
                {products.map((p) => (
                  <td key={p.id} className="p-4 border-b">
                     {/*
                        p.specifications[spec.name] が表示されない場合は、
                        コンソールで spec.name と specifications のキーが一致しているか確認してください。
                     */}
                    {p.specifications && p.specifications[spec.name] !== undefined
                      ? String(p.specifications[spec.name])
                      : '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
