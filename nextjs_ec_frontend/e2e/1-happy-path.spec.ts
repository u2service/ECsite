import { test, expect } from '@playwright/test';
import { registerNewUser } from './helpers/auth';

test.describe('基本購買シナリオ（ハッピーパス）', () => {
  test('会員登録から商品検索、カート投入、Stripe決済、注文履歴の確認まで一気通貫で成功する', async ({ page }) => {
    // 1. 会員登録
    const user = await registerNewUser(page);

    // 2. 商品検索
    await page.goto('/');
    const searchInput = page.getByPlaceholder('商品を検索...');
    await searchInput.fill('Ryzen'); // 実際に存在するキーワードまたは一覧から取得
    await page.locator('button:has-text("検索")').click();

    // 3. 商品一覧から最初の商品をクリックして商品詳細へ
    const firstProduct = page.locator('a[href^="/products/"]').first();
    await expect(firstProduct).toBeVisible();
    await firstProduct.click();

    // 商品詳細ページの表示確認
    await expect(page.locator('button:has-text("カートに入れる")')).toBeVisible();

    // 4. カートに追加
    await page.locator('button:has-text("カートに入れる")').click();

    // 5. カート画面へ移動
    await page.goto('/cart');
    await expect(page.locator('h1:has-text("ショッピングカート")')).toBeVisible();

    // 6. 配送先の都道府県を選択（例: 東京都）
    const prefectureSelect = page.locator('select');
    await prefectureSelect.selectOption('東京都');

    // 送料計算のローディング完了（「レジに進む」ボタンが有効化される）を待機
    const checkoutButton = page.locator('button:has-text("レジに進む")');
    await expect(checkoutButton).toBeEnabled({ timeout: 10000 });

    // 7. レジに進む（Stripe Checkoutページへ遷移）
    await checkoutButton.click();

    // Stripeのホスト画面への遷移を待機（URLに stripe.com が含まれる）
    await page.waitForURL(/.*stripe\.com.*/, { timeout: 20000 });

    // 8. Stripe決済画面のテストカード入力
    // Stripeの決済フォーム（iframe）を取得
    const stripeFrame = page.frameLocator('iframe').first();

    // 氏名の入力
    await stripeFrame.getByRole('textbox', { name: 'Full name' }).fill('テスト 太郎');

    // 郵便番号の入力
    const postalCode = stripeFrame.getByRole('combobox', { name: 'Postal code' });
    await postalCode.fill('100-0001');

    // 💡 【修正点】郵便番号入力後、都道府県セレクトが出現するのを確実に待機して選択
    const prefectureSelect02 = stripeFrame.getByRole('combobox', { name: 'Prefecture' });
    await prefectureSelect02.waitFor({ state: 'visible', timeout: 10000 });
    await prefectureSelect02.selectOption({ label: '東京都 — Tokyo' });

    // 💡 【修正点】市区町村欄の出現を待機して入力
    const cityInput = stripeFrame.getByRole('textbox', { name: 'City' });
    await cityInput.waitFor({ state: 'visible', timeout: 10000 });
    await cityInput.fill('千代田区');

    // 住所や電話番号が表示されている場合の入力（任意の補完）
    const addressLine1 = stripeFrame.getByPlaceholder('Address line 1');
    if (await addressLine1.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addressLine1.fill('千代田1-1');
    }
    const phoneInput = stripeFrame.getByPlaceholder('090-1234-5678');
    if (await phoneInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await phoneInput.fill('09012345678');
    }

    // カード番号・有効期限・CVCの入力
    await stripeFrame.getByRole('textbox', { name: 'Card number' }).fill('4242424242424242');
    await stripeFrame.getByRole('textbox', { name: 'Expiration (MM/YY)' }).fill('12/34');
    await stripeFrame.getByRole('textbox', { name: 'Security code' }).fill('123');

    // 「支払う」ボタンをクリック
    await stripeFrame.getByTestId('payment-form-submit-button').click();

    // 9. 注文完了画面（/checkout/success）へのリダイレクト確認
    await page.waitForURL(/.*\/checkout\/success.*/, { timeout: 30000 });
    await expect(page.getByText('お支払いありがとうございました！')).toBeVisible();

    // 10. 注文履歴画面で確認
    await page.goto('/orders/');
    await expect(page.locator('h1:has-text("注文履歴")')).toBeVisible();
    // 注文が1件以上存在し、ステータスが表示されていることを確認
    const orderItems = page.locator('.border.rounded-xl');
    await expect(orderItems.first()).toBeVisible();
    await expect(orderItems.first().locator('text=¥').first()).toBeVisible();
  });
});