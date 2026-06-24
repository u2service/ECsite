import Image from 'next/image';
import { getFullImageUrl } from '@/utils/image';
import Link from 'next/link';

// 💡 自動生成されたスキーマから型をインポート
import { paths } from '@/types/schema';

// ① 比較用商品APIから「単一の商品」の型を抽出
type DjangoCompareProduct = paths['/api/products/compare/']['get']['responses']['200']['content']['application/json'][number];

// ② スキーマから never が返ってきてしまうため、明示的にスペック定義の型を記述します 💡
interface DjangoSpecDefinition {
  id?: number;
  name: string;   // 例: "length", "width" など
  label: string;  // 例: "長さ", "幅" などの画面表示名
}

// 1. 商品データを取得する関数
async function fetchProducts(ids: string[]): Promise<DjangoCompareProduct[]> {
  const idQuery = ids.join(',');
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
  const url = `${API_BASE}/api/products/compare/?ids=${idQuery}`;
  console.log("Djangoにリクエスト送信中:", url);

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      console.error("Djangoがエラーを返しました:", res.status);
      return [];
    }
    const data = await res.json();
    console.log("取得したデータ:", data);
    return data;
  } catch (error) {
    console.error("通信自体に失敗しました（CORSやサーバー停止など）:", error);
    return [];
  }
}

// 2. カテゴリ項目定義を取得する関数
async function fetchSpecDefinitions(categoryId: number): Promise<DjangoSpecDefinition[]> {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
  // 💡 パスパラメータに合わせてエンドポイントを整形
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
export default async function ComparePage({ searchParams }: Props) {
  const params = await searchParams;
  const idsString = params.ids || ""; // "1,2,3" という文字列
  
  if (!idsString) {
    return <div className="p-10 text-red-500">比較する商品が選択されていません。</div>;
  }

  const productIds = idsString.split(',').filter(id => id !== "");
  const products = await fetchProducts(productIds);

  if (products.length === 0) {
    return <div className="p-10">該当する商品が見つかりませんでした。</div>;
  }

  // 💡 DjangoCompareProduct の構造に基づいて安全にアクセス
  const categoryId = products[0].category?.id ?? 0;
  console.log("リクエストするカテゴリID:", categoryId);

  const specDefinitions = await fetchSpecDefinitions(categoryId);

  const brandId = products[0].brand?.id;
  console.log("メーカー（ブランド）IDは", brandId);

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
                <th key={p.id} className="p-4 border-b font-semibold min-w-[200px]">
                  {p.category?.name || "未分類"}
                </th>
              ))}
            </tr>

            {/* メーカー（ブランド） */}
            <tr>
              <th className="p-4 border-b font-semibold w-40 sticky left-0 bg-gray-100">メーカー（ブランド）</th>
              {products.map((p) => (
                <th key={p.id} className="p-4 border-b font-semibold min-w-[200px]">
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
                      src={getFullImageUrl(p.image)}
                      alt={p.name ?? "商品画像"}
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
                <td key={p.id} className="p-4 border-b text-sm">
                  {p.description && p.description.length > 50
                    ? `${p.description.slice(0, 50)}...`
                    : p.description || ""}
                </td>
              ))}
            </tr>

            {/* スペック詳細のセクション見出し */}
            <tr className="bg-gray-200">
              <td colSpan={products.length + 1} className="p-2 font-bold text-center border-b">
                スペック詳細
              </td>
            </tr>

            {/* 各スペック項目をループで回す */}
            {specDefinitions.map((spec) => {
              const specName = spec.name ?? "";
              return (
                <tr key={specName} className="hover:bg-gray-50">
                  <td className="p-4 border-b font-medium sticky left-0 bg-gray-50">{spec.label}</td>

                  {/* 各商品の値 */}
                  {products.map((p) => {
                    // 💡 Django側の仕様に合わせたキーでの柔軟な型キャスト・安全アクセス
                    const specifications = p.specifications as Record<string, any> | undefined;
                    const val = specifications && specifications[specName] !== undefined
                      ? specifications[specName]
                      : '-';

                    return (
                      <td key={p.id} className="p-4 border-b">
                        {String(val)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}