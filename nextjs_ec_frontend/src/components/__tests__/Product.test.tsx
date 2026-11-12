import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import ProductClientWrapper from '../ProductClientWrapper';
import ProductCard from '../ProductCard';
import * as CartContextModule from '@/context/CartContext';
import { Product } from '@/types/product';

// next/image の最適化処理による警告を抑止するためのモック
vi.mock('next/image', () => ({
  default: ({ fill, priority, ...props }: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt || ''} />;
  },
}));

describe('ProductClientWrapper（商品詳細・在庫制御）', () => {
  const mockAddItemToCart = vi.fn();

  const baseProduct: Product = {
    id: 1,
    name: 'ゲーミングノートPC',
    price: 150000,
    stock: 5,
    available_stock: 5, // 有効在庫 5点
    description: 'ハイスペックPCです。',
    image: '/test.jpg',
    images: [],
    brand: { id: 1, name: 'Asus' }, 
    category: { id: 1, name: 'ノートPC' }, 
    specifications: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(CartContextModule, 'useCart').mockReturnValue({
      cart: null,
      loading: false,
      fetchCart: vi.fn(),
      addItemToCart: mockAddItemToCart,
      removeItemFromCart: vi.fn(),
      updateItemQuantity: vi.fn(),
      clearCart: vi.fn(),
    });
  });

  it('在庫がある場合、「在庫あり」と残り点数が表示され、カート投入ボタンが活性化していること', () => {
    render(<ProductClientWrapper product={baseProduct} />);

    // 文言と残り点数の確認
    expect(screen.getByText(/在庫あり（残り 5 点）/)).toBeInTheDocument();

    // カート投入ボタンの確認
    const button = screen.getByRole('button', { name: 'カートに入れる' });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();

    // ボタンクリックで addItemToCart が呼ばれること
    fireEvent.click(button);
    expect(mockAddItemToCart).toHaveBeenCalledWith(baseProduct.id, 1);
  });

  it('在庫切れ（available_stock: 0）の場合、「売り切れ」が表示され、ボタンが非活性となること', () => {
    const outOfStockProduct: Product = {
      ...baseProduct,
      stock: 0,
      available_stock: 0,
    };

    render(<ProductClientWrapper product={outOfStockProduct} />);

    // 売り切れ表示の確認
    expect(screen.getByText('申し訳ありません、現在売り切れです')).toBeInTheDocument();

    // ボタンが「売り切れ」表示かつ disabled であること
    const button = screen.getByRole('button', { name: '売り切れ' });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();

    // クリックしてもカート追加関数は呼ばれないこと
    fireEvent.click(button);
    expect(mockAddItemToCart).not.toHaveBeenCalled();
  });
});

describe('ProductCard（商品カード）', () => {
  const product: Product = {
    id: 10,
    name: 'ワイヤレスマウス',
    price: 3980,
    stock: 20,
    available_stock: 20,
    description: '高精度マウス',
    image: '/mouse.jpg',
    brand: { id: 2, name: 'Logicool' }, 
    category: { id: 2, name: '周辺機器' },
    specifications: {},
    comment_count: 3,
  };

  it('商品情報（名前、価格、ブランド名、コメント数）が正しくレンダリングされること', () => {
    render(<ProductCard product={product} />);

    expect(screen.getByText('ワイヤレスマウス')).toBeInTheDocument();
    expect(screen.getByText('¥3,980')).toBeInTheDocument();
    expect(screen.getByText('Logicool')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('比較チェックボックスのトグル操作で onCheckChange が発火すること', () => {
    const mockOnCheckChange = vi.fn();
    render(
      <ProductCard
        product={product}
        isChecked={false}
        onCheckChange={mockOnCheckChange}
        showCheckbox={true}
      />
    );

    const checkbox = screen.getByRole('checkbox', { name: '比較' });
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);
    expect(mockOnCheckChange).toHaveBeenCalledWith(product.id, true);
  });
});