"use client";
import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

// 💡 1. ユーザーオブジェクトの型定義（必要に応じてフィールドを追加してください）
interface User {
  pk: number;
  username: string;
  email: string;
  [key: string]: any; // 他の動的フィールドを許容
}

// 💡 2. Context が提供する値の型定義
interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginUser: (email: string, password: string) => Promise<void>;
  logoutUser: () => Promise<void>;
  registerUser: (username: string, password: string, email?: string) => Promise<void>;
  fetchOptions: (method: string, body?: any) => RequestInit;
  secureFetch: (url: string, options: RequestInit) => Promise<Response>; // 👈 追加：共通検知用Fetch
}

// Context の初期化（TypeScript用に型を指定）
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  // --- CookieからCSRFトークンを取得するヘルパー関数 ---
  const getCsrfToken = (): string | null => {
    if (typeof document === 'undefined') return null; // SSR対策
    const value = `; ${document.cookie}`;
    const parts = value.split(`; csrftoken=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  };

  // 共通の fetch オプション生成
  const fetchOptions = useCallback((method: string, body: any = null): RequestInit => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    
    if (method !== 'GET') {
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }
    }

    return {
      method,
      headers,
      credentials: 'include',
      ...(body && { body: JSON.stringify(body) }),
    };
  }, []);

  // 💡 3. 強制ログアウト処理（ゾンビ状態を画面から完全に一掃する）
  const handleSessionTimeout = useCallback(() => {
    setUser(null);
    // タイムアウトしたことがわかるパラメータを付与してログインへ誘導
    router.push('/login?timeout=true');
  }, [router]);

  // 💡 4. アプリ全体の401（認証切れ）を中央監視するラッパーFetch関数
  const secureFetch = useCallback(async (url: string, options: RequestInit): Promise<Response> => {
    const res = await fetch(url, options);
    
    // バックエンドが「認証なし(401)」を返してきたら即座にフロント側もログアウトさせる
    if (res.status === 401) {
      console.warn("セッションの有効期限が切れたか、未認証です。自動ログアウトします。");
      handleSessionTimeout();
    }
    return res;
  }, [handleSessionTimeout]);

  // 1. ユーザーの状態を確認
  const checkUserStatus = useCallback(async () => {
    try {
      // 💡 fetch ではなく secureFetch を使うことで、ここでの401も自動でリダイレクト対象になります
      const res = await secureFetch(`${apiUrl}/api/auth/user/`, fetchOptions('GET'));
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Check status error:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, fetchOptions, secureFetch]);

  // ページ初期読み込み時のチェック
  useEffect(() => {
    checkUserStatus();
  }, [checkUserStatus]);

  // 2. ログイン
  const loginUser = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch(`${apiUrl}/api/auth/login/`, fetchOptions('POST', { email, password }));
      if (res.ok) {
        const data = await res.json();
        setUser(data.user); 
        router.push('/');
      } else {
        const errorData = await res.json();
        alert(errorData.non_field_errors || "ログインに失敗しました。");
      }
    } catch (error) {
      console.error('Login error:', error);
    }
  }, [apiUrl, fetchOptions, router]);

  // 3. ログアウト
  const logoutUser = useCallback(async () => {
    try {
      await fetch(`${apiUrl}/api/auth/logout/`, fetchOptions('POST'));
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      router.push('/login');
    }
  }, [apiUrl, fetchOptions, router]);

  // 4. 会員登録
  const registerUser = useCallback(async (username: string, password: string, email: string = "") => {
    try {
      const res = await fetch(
        `${apiUrl}/api/auth/registration/`, 
        fetchOptions('POST', { username, password, email })
      );

      if (res.ok) {
        console.log('会員登録成功！続けてログインします...');
        await loginUser(email, password);
      } else {
        const errorData = await res.json();
        console.error('登録失敗:', errorData);
        alert('登録に失敗しました。');
      }
    } catch (error) {
      console.error('登録エラー:', error);
    }
  }, [apiUrl, fetchOptions, loginUser]);

  return (
    <AuthContext.Provider value={{ user, loading, loginUser, logoutUser, registerUser, fetchOptions, secureFetch }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};