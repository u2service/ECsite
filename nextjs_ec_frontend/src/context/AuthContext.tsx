"use client";
import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export interface User {
  pk: number;
  username: string;
  email: string;
  [key: string]: any; 
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginUser: (email: string, password: string) => Promise<void>;
  logoutUser: () => Promise<void>;
  registerUser: (username: string, password: string, email?: string) => Promise<void>;
  fetchOptions: (method: string, body?: any) => RequestInit;
  secureFetch: (url: string, options: RequestInit) => Promise<Response>; 
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

interface AuthProviderProps { children: ReactNode; }

export const AuthProvider = ({ children }: AuthProviderProps): React.ReactElement => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const isTimingOutRef = useRef<boolean>(false);
  
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

  const getCsrfToken = (): string | null => {
    if (typeof document === 'undefined') return null; 
    const value = `; ${document.cookie}`;
    const parts = value.split(`; csrftoken=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  };

  const fetchOptions = useCallback((method: string, body: any = null): RequestInit => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (method !== 'GET') {
      const csrfToken = getCsrfToken();
      if (csrfToken) headers['X-CSRFToken'] = csrfToken;
    }
    const options: RequestInit = { method, headers, credentials: 'include' };
    if (body) options.body = JSON.stringify(body);
    return options;
  }, []);

  // 3. タイムアウト処理
  const handleSessionTimeout = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (isTimingOutRef.current) return;
    isTimingOutRef.current = true;

    const currentPath = window.location.pathname;

    // ログイン不要・パスワード関連の画面、および決済キャンセル画面ではトーストを出さない
    if (
      currentPath === '/login' || 
      currentPath === '/forgot-password' || 
      currentPath.startsWith('/password-reset-confirm') ||
      currentPath === '/checkout/cancel' // 👈 キャンセル画面でのトーストを確実にガード
    ) {
      setUser(null);
      isTimingOutRef.current = false;
      return;
    }

    // 💡 シンプルに「タイムアウト通知」を発火させてトップへ戻す
    toast("タイムアウトによりログアウトされました。");
    setUser(null);
    router.push('/');

    setTimeout(() => { isTimingOutRef.current = false; }, 3000);
  }, [router]);

  // 4. アプリ全体の401（認証切れ）を中央監視するラッパーFetch関数（※完全不動・空の依存配列で無限ループを徹底防止）
  const secureFetch = useCallback(async (url: string, options: RequestInit): Promise<Response> => {
    const res = await fetch(url, options);
    if (res.status === 401) {
      console.warn("セッションの有効期限が切れたか、未認証です。自動ログアウトします。");
      handleSessionTimeout();
    }
    return res;
  }, [handleSessionTimeout]);

  // 1. ユーザーの状態を確認
  const checkUserStatus = useCallback(async () => {
    try {
      // ─── ✨ 【核心の修正】初期チェックは中央監視(secureFetch)を通さず、通常の fetch で叩く ───
      const res = await fetch(`${apiUrl}/api/auth/user/`, fetchOptions('GET'));
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (error: any) {
      console.error("Check status error:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, fetchOptions]); // 💡 secureFetch への依存が消えたため、連鎖の危険性が完全にゼロに

  useEffect(() => {
    checkUserStatus();
  }, [checkUserStatus]);

  const loginUser = useCallback(async (email: string, password: string): Promise<void> => {
    try {
      const res = await fetch(`${apiUrl}/api/auth/login/`, fetchOptions('POST', { email, password }));
      if (res.ok) {
        const data = await res.json();
        setUser(data.user); 
        router.push('/');
      } else {
        const errorData = await res.json();
        toast.error(errorData.non_field_errors || "ログインに失敗しました。")
      }
    } catch (error) { console.error('Login error:', error); }
  }, [apiUrl, fetchOptions, router]);

  const logoutUser = useCallback(async (): Promise<void> => {
    try { await fetch(`${apiUrl}/api/auth/logout/`, fetchOptions('POST')); } 
    catch (error) { console.error('Logout error:', error); } 
    finally { setUser(null); router.push('/login'); }
  }, [apiUrl, fetchOptions, router]);

  const registerUser = useCallback(async (username: string, password: string, email: string = ""): Promise<void> => {
    try {
      const res = await fetch(`${apiUrl}/api/auth/registration/`, fetchOptions('POST', { username, password, email }));
      if (res.ok) {
        await loginUser(email, password);
      } else {
        const errorData = await res.json();
        toast.error('登録に失敗しました。')
      }
    } catch (error) { console.error('登録エラー:', error); }
  }, [apiUrl, fetchOptions, loginUser]);

  return (
    <AuthContext.Provider value={{ user, loading, loginUser, logoutUser, registerUser, fetchOptions, secureFetch }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};