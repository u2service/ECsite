import { test, expect } from '@playwright/test';
import { registerNewUser } from './helpers/auth';
import { execSync } from 'child_process'; 

test.describe('在庫切れ・タッチの差シナリオ（アンハッピーパス）', () => {
  // 💡 【追加】テスト実行前に、前回の仮押さえを自動解除して在庫を1点に戻す
  test.beforeEach(async () => {
    try {
      execSync(
        `.\\.venv\\Scripts\\python.exe -c "import os, django; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings'); django.setup(); from products.models import Order;
        Order.objects.filter(status='pending_reservation', user__username__startswith='testuser').update(status='expired')"`,
        { cwd: '../django_ec_backend' }
      );
    } catch (e) {
      console.warn('仮押さえリセットをスキップしました:', e);
    }
  });

  test('別ユーザーによって商品が仮押さえされた場合、決済時に適切なエラーが表示される', async ({ browser }) => {
    // 2つの独立したブラウザコンテキスト（別ウィンドウ）を立ち上げ
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      // 1. ユーザーAとユーザーBをそれぞれ会員登録
      await registerNewUser(pageA);
      await registerNewUser(pageB);

      // 対象の商品詳細ページへ遷移（在庫が残り1点、または最後の1点の商品IDを指定）
      // ※ テスト環境の対象商品IDに合わせて変更してください（例: /products/1）
      const targetProductUrl = '/products/28/';

      // 2. ユーザーA: 商品をカートに入れてカート画面へ
      await pageA.goto(targetProductUrl);
      await pageA.locator('button:has-text("カートに入れる")').click();
      await pageA.goto('/cart');
      await pageA.locator('select').selectOption('東京都');
      await expect(pageA.locator('button:has-text("レジに進む")')).toBeEnabled();

      // 3. ユーザーB: 同じ商品をカートに入れて先に決済に進む（仮押さえロックを発動）
      await pageB.goto(targetProductUrl);
      await pageB.locator('button:has-text("カートに入れる")').click();
      await pageB.goto('/cart');
      await pageB.locator('select').selectOption('東京都');

      const checkoutBtnB = pageB.locator('button:has-text("レジに進む")');
      await expect(checkoutBtnB).toBeEnabled();
      await checkoutBtnB.click();

      // ユーザーBがStripe画面に遷移した（＝バックエンドで仮押さえ Order が生成された）ことを確認
      await pageB.waitForURL(/.*stripe\.com.*/, { timeout: 20000 });

      // 4. ユーザーA: タッチの差で「レジに進む」をクリック
      await pageA.locator('button:has-text("レジに進む")').click();

      // 5. 検証: ユーザーA側で在庫不足・仮押さえエラーのトースト/アラートが表示されることを確認
      // checkout_views.py が返す「現在別のお客様が手続き中、または在庫不足です」メッセージの検証
      const errorMessageLocator = pageA.getByText(/現在別のお客様が手続き中、または在庫不足です/);
      await expect(errorMessageLocator).toBeVisible({ timeout: 10000 });

      // Stripe画面には遷移せず、カート画面にとどまっていることを確認
      expect(pageA.url()).toContain('/cart');

    } finally {
      await contextA.close();
      await contextB.close();
    }
  });
});