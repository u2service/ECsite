import Link from 'next/link';
import CategoryClientWrapper from '@/components/CategoryClientWrapper';
import NewArrivals from '@/components/NewArrivals';
import { Product } from '@/types/product'; // Product 型をインポート

// カテゴリパスとツリーノードの型定義
interface CategoryPath {
  id: number;
  name: string;
}

interface CategoryNode {
  id: number;
  name: string;
  children?: CategoryNode[];
}

// category_pathプロパティを持つ可能性のあるProduct型
interface CategoryProduct extends Product {
  category_path?: CategoryPath[];
}

// ヘルパー関数の型定義
const findCategoryAndPath = (
  nodes: CategoryNode[],
  targetId: number,
  currentPath: CategoryPath[] = []
): { name: string; path: CategoryPath[] } | null => {
  for (const node of nodes) {
    const path = [...currentPath, { id: node.id, name: node.name }];
    if (node.id === targetId) return { name: node.name, path: path };
    if (node.children) {
      const found = findCategoryAndPath(node.children, targetId, path);
      if (found) return found;
    }
  }
  return null;
};

// Next.jsのApp RouterのPageProps of page.tsx
interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CategoryProductsPage({ params }: PageProps) {
  const { id: categoryId } = await params;
  const targetId = parseInt(categoryId);

  // 1. 商品一覧をサーバー側で取得
  const productRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products/?category_id=${categoryId}`, { next: { revalidate: 60 } });
  const products: CategoryProduct[] = productRes.ok ? await productRes.json() : [];

  // 2. このカテゴリの新着商品（最新10件）を取得
  const newArrivalRes = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/products/?category_id=${categoryId}&ordering=-created_at&limit=10`,
    { next: { revalidate: 60 } }
  );
  const newArrivals = newArrivalRes.ok ? await newArrivalRes.json() : [];

  // 3. パンくずとカテゴリ名の設定
  let categoryName = '';
  let categoryPath: CategoryPath[] = [];

  if (products.length > 0 && products[0].category_path) {
    const fullPath = products[0].category_path;
    const currentIndex = fullPath.findIndex(p => p.id === targetId);
    categoryPath = currentIndex !== -1 ? fullPath.slice(0, currentIndex + 1) : fullPath;
    categoryName = categoryPath[categoryPath.length - 1]?.name || '';
  } else {
    const treeRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/category-tree/`, { next: { revalidate: 3600 } });
    if (treeRes.ok) {
      const treeData = await treeRes.json();
      const result = findCategoryAndPath(treeData, targetId);
      if (result) {
        categoryName = result.name;
        categoryPath = result.path;
      }
    }
  }

  return (
    <div className="px-4 py-6 overflow-hidden">
      {/* パンくず */}
      <nav className="flex text-sm text-gray-500 mb-6">
        <ol className="flex items-center space-x-2">
          <li><Link href="/" className="hover:text-blue-600">ホーム</Link></li>
          {categoryPath.map((path) => (
            <li key={path.id} className="flex items-center space-x-2">
              <span className="text-gray-400">&gt;</span>
              <Link href={`/categories/${path.id}`} className={path.id === targetId ? 'font-bold text-gray-800' : 'hover:text-blue-600'}>
                {path.name}
              </Link>
            </li>
          ))}
        </ol>
      </nav>

      <h1 className="text-3xl font-bold mb-8">
        {categoryName ? `${categoryName} 一覧` : 'カテゴリ別商品'}
      </h1>

      {/* 新着商品セクション */}
      <NewArrivals products={newArrivals} />

      <hr className="my-10 border-gray-200" />

      {/* 通常の商品リスト */}
      <h2 className="text-2xl font-bold mb-6">すべての商品</h2>
      
      {/* インタラクティブな部分 (categoryName は不要なため削除しました) */}
      <CategoryClientWrapper
        products={products}
        categoryId={targetId}
      />
    </div>
  );
}
