// types/product.ts

// 商品性能のラベル定義
export type SpecDefinition = {
  name: string;   // 例: "cpu"
  label: string;  // 例: "CPU"
};


// 商品性能のラベル定義
export type BrandDefinition = {
  id: number;
  name: string;   // 例: "cpu"
};

// 商品データの型
export type Product = {
  id: number;
  name: string;
  brand: BrandDefinition;
  price: number;
  image: string;
  category: {
    id: number;
    name: string;
  }
  description: string; // ★これを追加！
  specifications: {
    [key: string]: string | number | boolean | null;
  };
};