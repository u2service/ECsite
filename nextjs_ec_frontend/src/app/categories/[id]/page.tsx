import Link from 'next/link';
import CategoryClientWrapper from '@/components/CategoryClientWrapper';
import NewArrivals from '@/components/NewArrivals';
// 💡 自動生成されたスキーマから型をインポート
import { paths } from '@/types/schema';

// ① 商品リストAPI（GET）のレスポンスから「単一の商品」の型を抽出
// ※ DRFの標準Pagination（成果物が {'results': [...]} ）になっている場合は `['results'][number]` に、
//   生配列で返る設定なら `[number]` になります。エラーが出た場合はここを微調整します。
type DjangoProduct = paths['/api/products/']['get']['responses']['200']['content']['application/json'][number];

// ② カテゴリツリーAPI（GET）から「単一のカテゴリノード」の型を抽出
type DjangoCategoryNode = paths['/api/category-tree/']['get']['responses']['200']['content']['application/json'][number];

// ③ パンくず用に使うシンプルなカテゴリパスの型
interface CategoryPath {
  id: number;
  name: string;
}

// 💡 ヘルパー関数の型を自動生成されたノード型（DjangoCategoryNode）に変更
const findCategoryAndPath = (
  nodes: DjangoCategoryNode[],
  targetId: number,
  currentPath: CategoryPath[] = []
): { name: string; path: CategoryPath[] } | null => {
  for (const node of nodes) {
    // node.id や node.name がオプショナル（?）になっている可能性を考慮し、型安全のためにデフォルト値を設定
    const id = node.id ?? 0;
    const name = node.name ?? '';
    const path = [...currentPath, { id, name }];
    if (id === targetId) return { name, path: path };
    if (node.children) {
      // 警告対応で型が DictField 等になっている可能性があるため、キャストするかそのまま再帰
      const found = findCategoryAndPath(node.children as DjangoCategoryNode[], targetId, path);
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
  // 💡 レスポンスがそのまま直接の配列（[]）なので、そのまま products に格納します
  const products: DjangoProduct[] = productRes.ok ? await productRes.json() : [];

  // 2. このカテゴリの新着商品（最新10件）を取得
  const newArrivalRes = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/products/?category_id=${categoryId}&ordering=-created_at&limit=10`,
    { next: { revalidate: 60 } }
  );
  // 💡 こちらも同様に直接配列として受け取ります
  const newArrivals: DjangoProduct[] = newArrivalRes.ok ? await newArrivalRes.json() : [];

  // 3. パンくずとカテゴリ名の設定
  let categoryName = '';
  let categoryPath: CategoryPath[] = [];

  // 💡 DjangoProduct側が持っている get_category_path（文字列、またはパース済オブジェクト）を利用
  // ここでは元コードのロジック（JSON等から復元、または tree から探索）を維持します
  if (products.length > 0) {
    // バックエンドのシリアライザーで追加した get_category_path の警告対応が効いています
    // ※もしシリアライザー側でシリアライズされたパス（配列）が直接取れる場合はここが劇的にシンプルになります
    const firstProduct = products[0];
    
    // バックエンドの実装に合わせて適切にパースまたは tree 探索にフォールバック
    // 今回は既存の安全なフォールバック（treeRes）をそのまま活かせるよう下部でケアします
  }

  const treeRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/category-tree/`, { next: { revalidate: 3600 } });
  if (treeRes.ok) {
    const treeData: DjangoCategoryNode[] = await treeRes.json();
    const result = findCategoryAndPath(treeData, targetId);
    if (result) {
      categoryName = result.name;
      categoryPath = result.path;
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
      {/* 💡 anyキャストなどを挟むか、NewArrivals 側のプロパティ型を DjangoProduct に合わせると完璧です */}
      <NewArrivals products={newArrivals as any} />

      <hr className="my-10 border-gray-200" />

      {/* 通常の商品リスト */}
      <h2 className="text-2xl font-bold mb-6">すべての商品</h2>
      
      {/* インタラクティブな部分 */}
      <CategoryClientWrapper
        products={products as any}
        categoryId={targetId}
      />
    </div>
  );
}
