import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CookieConsentBanner from '../CookieConsentBanner';

describe('CookieConsentBanner', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    // window.location.reload をモック化
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { reload: vi.fn() },
    });
  });

  it('同意情報が保存されていない初回訪問時にバナーが表示されること', () => {
    render(<CookieConsentBanner />);

    expect(screen.getByText('Cookie（クッキー）の利用について')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'すべてのCookieを受け入れる' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '必須Cookieのみ許可（拒否）' })).toBeInTheDocument();
  });

  it('「すべてのCookieを受け入れる」をクリックした際、全許可でlocalStorageに保存されること', () => {
    render(<CookieConsentBanner />);

    const acceptAllButton = screen.getByRole('button', { name: 'すべてのCookieを受け入れる' });
    fireEvent.click(acceptAllButton);

    const savedSettings = JSON.parse(localStorage.getItem('cookie-consent-settings') || '{}');
    expect(savedSettings).toEqual({
      essential: true,
      performance: true,
      advertising: true,
    });
    expect(localStorage.getItem('cookie-consent-level')).toBe('all');
    expect(window.location.reload).toHaveBeenCalled();
  });

  it('「必須Cookieのみ許可」をクリックした際、必須のみ有効でlocalStorageに保存されること', () => {
    render(<CookieConsentBanner />);

    const essentialOnlyButton = screen.getByRole('button', { name: '必須Cookieのみ許可（拒否）' });
    fireEvent.click(essentialOnlyButton);

    const savedSettings = JSON.parse(localStorage.getItem('cookie-consent-settings') || '{}');
    expect(savedSettings).toEqual({
      essential: true,
      performance: false,
      advertising: false,
    });
    expect(localStorage.getItem('cookie-consent-level')).toBe('essential');
    expect(window.location.reload).toHaveBeenCalled();
  });

  it('既に設定が保存されている場合はバナーが表示されないこと', () => {
    localStorage.setItem('cookie-consent-level', 'all');

    render(<CookieConsentBanner />);

    expect(screen.queryByText('Cookie（クッキー）の利用について')).not.toBeInTheDocument();
  });
});