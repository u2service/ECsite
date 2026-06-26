import React from 'react';
import Link from 'next/link';
import ProductClientWrapper from '@/components/ProductClientWrapper'; // 後で作る
import CommentSection from '@/components/CommentSection';

// ==========================================
// 💡 型定義（Interfaces）
// ==========================================
interface CategoryPath {
  id: number;
  name: string;
}

interface SpecDefinition {
  name: string;
  label: string;
}

interface Product {
  id: number;
  name: string;
  brand?: {
    name: string;
  };
  category: {
    id: number;
    name: string;
  };
  category_path?: CategoryPath[];
  // インデックスシグネチャを用いて動的なスペック値に対応
  specifications?: Record<string, string | number | boolean>;
  [key: string]: any; // その他の未知のフィールド用（必要に応じて厳格化可能）
}

// Next.js のページコンポーネント用 Params 型
interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

// ==========================================
// 🌐 データフェッチ関数
// ==========================================
async function getProduct(id: string): Promise<Product | null> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products/${id}/`, {
    next: { revalidate: 0 } // no-store と同等、または最新の形式
  });
  if (!res.ok) return null;
  return res.json();
}

// スペック定義を取得する関数
async function getSpecDefinitions(categoryId: number): Promise<SpecDefinition[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/category-specs/${categoryId}/`, {
    next: { revalidate: 0 }
  });
  if (!res.ok) return [];
  return res.json();
}

// ==========================================
// 📄 メインページコンポーネント
// ==========================================
export default async function ProductPage({ params }: PageProps): Promise<React.ReactElement> {
  // ① params は Promise なので await して安全に取得
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    return <div className="text-center mt-10 text-gray-600">商品が見つかりません。</div>;
  }

  // ② カテゴリIDをもとに動的スペック定義を取得
  const specDefinitions = await getSpecDefinitions(product.category.id);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* パンくずリスト（SEO最適化のためにサーバー側でレンダリング） */}
      <nav className="flex text-sm text-gray-500 mb-6">
        <ol className="flex items-center space-x-2">
          <li><Link href="/" className="hover:text-blue-600">ホーム</Link></li>
          {product.category_path?.map((path) => (
            <li key={path.id} className="flex items-center space-x-2">
              <span>&gt;</span>
              <Link href={`/categories/${path.id}`} className="hover:text-blue-600">
                {path.name}
              </Link>
            </li>
          ))}
        </ol>
      </nav>

      {/* 💡 動き（画像切り替え・カート追加）が必要な部分は子コンポーネントに任せる */}
      <ProductClientWrapper product={product} />

      {/* スペック詳細テーブル */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold mb-6 pb-2 border-b-2 border-gray-200 text-slate-900">主な仕様</h2>
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

      {/* コメントセクション */}
      <CommentSection productId={product.id} />
      
      <div className="mt-12">
        <Link href="/" className="text-blue-600 hover:underline flex items-center">
          <span className="mr-2">←</span> 商品一覧に戻る
        </Link>
      </div>
    </div>
  );
}