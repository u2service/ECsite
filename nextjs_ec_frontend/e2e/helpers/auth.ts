import { Page, expect } from '@playwright/test';

export async function bypassCookieBanner(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'cookie-consent-settings',
      JSON.stringify({ essential: true, performance: true, advertising: true })
    );
    window.localStorage.setItem('cookie-consent-level', 'all');
  });
}

export async function registerNewUser(page: Page) {
  await bypassCookieBanner(page);

  const timestamp = Date.now();
  const username = `testuser_${timestamp}`;
  const email = `testuser_${timestamp}@example.com`;
  const password = 'Password123!';

  // 💡 【修正点1】trailingSlash: true に合わせて末尾に / を付ける
  await page.goto('/signup/');

  // 💡 【修正点2】各フィールドを確実に待って入力
  const usernameInput = page.locator('#username');
  await usernameInput.waitFor({ state: 'visible' });
  await usernameInput.fill(username);

  const emailInput = page.locator('#email');
  await emailInput.fill(email);

  const passwordInput = page.locator('#password');
  await passwordInput.fill(password);

  // 💡 【修正点3】ボタンクリックの代わりにパスワード欄で Enter キーを押してフォーム送信を発火
  // （クリックイベントの空振り・バリデーション不整合を完全に防止）
  await passwordInput.press('Enter');

  // ログイン成功（ログアウトボタンの表示）を待機
  // （会員登録 ➔ 自動ログイン ➔ トップページ遷移が完了するまで最大20秒待機）
  await expect(page.locator('button:has-text("ログアウト")')).toBeVisible({ timeout: 20000 });

  return { username, email, password };
}