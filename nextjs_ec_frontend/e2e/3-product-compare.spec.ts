import { test, expect } from '@playwright/test';
import { bypassCookieBanner } from './helpers/auth';

test.describe('商品比較シナリオ', () => {
  test('複数の商品を比較バーに追加し、比較ページでスペックが並んで表示される', async ({ page }) => {
    // Cookieバナーを非表示化
    await bypassCookieBanner(page);

    // 1. トップページ（商品一覧）にアクセス
    await page.goto('/');

    // 2. 商品カードの「比較」チェックボックスを2つ選択
    const compareCheckboxes = page.locator('input[type="checkbox"][id^="compare-"]');
    await expect(compareCheckboxes.first()).toBeVisible({ timeout: 10000 });

    const count = await compareCheckboxes.count();
    expect(count).toBeGreaterThanOrEqual(2);

    // 1点目と2点目をチェック
    await compareCheckboxes.nth(0).click();
    await compareCheckboxes.nth(1).click();

    // 3. フローティング比較バーの表示と件数を確認
    const compareBar = page.locator('text=選択中');
    await expect(compareBar).toBeVisible();
    await expect(page.locator('text=2 件')).toBeVisible();

    // 4. 「比較する」ボタンをクリック
    const compareButton = page.locator('button:has-text("比較する")');
    await expect(compareButton).toBeVisible();
    await compareButton.click();

    // 5. 比較ページ（/compare?ids=...）への遷移確認
    await page.waitForURL(/.*\/compare\/?\?ids=.*/, { timeout: 10000 });

    // 6. 比較テーブルとスペック項目が正しく表示されているか検証
    await expect(page.locator('h1:has-text("商品性能比較")')).toBeVisible();

    const compareTable = page.locator('table');
    await expect(compareTable).toBeVisible();

    const headerCols = compareTable.locator('thead tr').first().locator('th');
    await expect(headerCols).toHaveCount(3);
    await expect(compareTable.locator('text=カテゴリ')).toBeVisible();
  });
});