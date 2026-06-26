// src/types/product.ts

// 商品性能のラベル定義（フィルタやスペック一覧の表示用）
export type SpecDefinition = {
  name: string;   // 例: "cpu"
  label: string;  // 例: "CPU"
};

// ブランドの定義
export type BrandDefinition = {
  id: number;
  name: string;   // 例: "Apple"
};

// 詳細画面などの複数画像（サブ画像）の型定義
export type ProductImage = {
  id: number;
  image: string;
  alt_text?: string;
};

// ==========================================
// 📦 アプリ全体で使い回す共通の商品データの型
// ==========================================
export type Product = {
  id: number;
  name: string;
  brand: BrandDefinition | null; // ブランド未設定の場合も考慮して null を許容
  price: number;
  image: string;
  category: {
    id: number;
    name: string;
  };
  description: string;
  stock: number; // ★ 在庫数も共通化
  images?: ProductImage[]; // ★ 詳細画面用のサブ画像一覧（オプショナル）
  comment_count?: number;
  specifications: {
    [key: string]: string | number | boolean | null;
  };
};