import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import CartPage from '../page';
import CancelContent from '@/app/checkout/cancel/CancelContent';
import * as CartContextModule from '@/context/CartContext';
import * as AuthContextModule from '@/context/AuthContext';

// ★ vi.hoisted を使い、vi.mock より前に安全にモック関数を初期化する
const { mockPush, mockToast } = vi.hoisted(() => {
const toastFn = Object.assign(vi.fn(), {
    error: vi.fn(),
    success: vi.fn(),
});
return {
    mockPush: vi.fn(),
    mockToast: toastFn,
};
});

vi.mock('next/navigation', () => ({
useRouter: () => ({ push: mockPush }),
useSearchParams: () => ({
    get: (param: string) => (param === 'session_id' ? 'cs_test_expired' : null),
}),
}));

vi.mock('sonner', () => ({
  toast: mockToast,
}));

// 3. next/image のモック化 (fill / priority の警告抑止)
vi.mock('next/image', () => ({
  default: ({ fill, priority, ...props }: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt || ''} />;
  },
}));

// 4. Stripe SDK のモック化
vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn().mockResolvedValue({}),
}));

describe('カート〜チェックアウト統合テスト (/cart)', () => {
  // テスト用のカートデータ（商品1点: ¥5,000）
  const mockCart = {
    items: [
      {
        id: 1,
        product: {
          id: 101,
          name: '高機能キーボード',
          price: 5000,
          image: '/keyboard.jpg',
        },
        quantity: 1,
      },
    ],
    grand_total: 5000,
  };

  const mockUser = { pk: 1, username: 'buyer', email: 'buyer@example.com' };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();

    // ★ Vitestの公式APIで location をモック化
    vi.stubGlobal('location', {
      href: '',
    });

    // CartContext のモック
    vi.spyOn(CartContextModule, 'useCart').mockReturnValue({
      cart: mockCart as any,
      loading: false,
      fetchCart: vi.fn(),
      addItemToCart: vi.fn(),
      removeItemFromCart: vi.fn(),
      updateItemQuantity: vi.fn(),
      clearCart: vi.fn(),
    });

    // AuthContext のモック
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: mockUser,
      loading: false,
      loginUser: vi.fn(),
      logoutUser: vi.fn(),
      registerUser: vi.fn(),
      fetchOptions: (method: string, body?: any) => ({
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      }),
      secureFetch: (url: string, options: any) => global.fetch(url, options),
    });
  });

  afterEach(() => {
    // ★ モック化したグローバルオブジェクトを元に戻す
    vi.unstubAllGlobals();
  });

  it('都道府県を選択すると送料APIが呼び出され、送料と総支払額がリアルタイムに更新されること', async () => {
    // 送料計算APIのレスポンス（東京都: 送料800円）
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ shipping_total: 800 }),
    });

    render(<CartPage />);

    // 初期状態: ¥5,000 の表示が存在し、送料が ¥0 であること
    expect(screen.getAllByText('¥5,000').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('¥0')).toBeInTheDocument();

    // 都道府県が未選択なので「レジに進む」ボタンは非活性
    const checkoutButton = screen.getByRole('button', { name: 'レジに進む' });
    expect(checkoutButton).toBeDisabled();

    // 都道府県セレクトボックスで「東京都」を選択
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '東京都' } });

    // 送料計算APIが正しく呼ばれたか待機・検証
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/cart/calculate-shipping/?prefecture=%E6%9D%B1%E4%BA%AC%E9%83%BD'),
        expect.anything()
      );
    });

    // 送料（¥800）および総支払額（商品¥5,000 + 送料¥800 = ¥5,800）が反映されていること
    await waitFor(() => {
      expect(screen.getByText('¥800')).toBeInTheDocument();
      expect(screen.getByText('¥5,800')).toBeInTheDocument();
    });

    // ボタンが活性化すること
    expect(checkoutButton).not.toBeDisabled();
  });

  it('「レジに進む」ボタン押下時にチェックアウトセッションを作成し、Stripeの決済URLへリダイレクトされること', async () => {
    // 1. 都道府県選択時の送料計算レスポンス
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ shipping_total: 800 }),
    });

    render(<CartPage />);

    // 都道府県を選択
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '東京都' } });
    await waitFor(() => expect(screen.getByText('¥800')).toBeInTheDocument());

    // 2. セッション作成APIのレスポンスをモック
    const stripeUrl = 'https://checkout.stripe.com/pay/cs_test_session_123';
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'cs_test_session_123',
        url: stripeUrl,
      }),
    });

    // 「レジに進む」ボタンをクリック
    const checkoutButton = screen.getByRole('button', { name: 'レジに進む' });
    fireEvent.click(checkoutButton);

    // セッション作成APIが正しいパラメータで送信されたこと
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/create-checkout-session/'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ prefecture: '東京都' }),
        })
      );
    });

    // Stripeの決済ページURLへリダイレクトされたこと
    await waitFor(() => {
      expect(window.location.href).toBe(stripeUrl);
    });
  });

  it('在庫不足エラー（400）発生時にエラー内容がトースト通知（sonner）に表示されること', async () => {
    // 送料計算レスポンス
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ shipping_total: 800 }),
    });

    render(<CartPage />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '東京都' } });
    await waitFor(() => expect(screen.getByText('¥800')).toBeInTheDocument());

    // セッション作成で在庫不足エラーが返るモック
    const errorMessage = '高機能キーボード は現在別のお客様が手続き中、または在庫不足です（購入可能数: 0個）。';
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: errorMessage }),
    });

    // 「レジに進む」をクリック
    const checkoutButton = screen.getByRole('button', { name: 'レジに進む' });
    fireEvent.click(checkoutButton);

    // トースト通知（toast）に関数としてエラーメッセージが渡されたこと
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.stringContaining(errorMessage)
      );
    });

    // リダイレクトは発生していないこと
    expect(window.location.href).toBe('');
  });
});

describe('キャンセル・失効確認画面 (/checkout/cancel)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('注文が時間切れ失効（expired）かつ在庫が残っている場合、案内文とカートへ戻るボタンが表示されること', async () => {
    // ステータス確認APIのレスポンスモック
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: 'expired',
        has_stock: true,
      }),
    });

    render(<CancelContent />);

    // 取得完了まで待機
    await waitFor(() => {
      expect(screen.queryByText('注文状態を確認中...')).not.toBeInTheDocument();
    });

    // 失効メッセージと在庫ありの案内が表示されること
    expect(screen.getByText('お支払い有効期限切れ')).toBeInTheDocument();
    expect(screen.getByText(/ご注文の仮押さえは自動的にキャンセルされました/)).toBeInTheDocument();
    expect(screen.getByText(/商品の在庫はまだ残っています！/)).toBeInTheDocument();
  });
});