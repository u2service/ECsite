"use client";
import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

// 💡 1. ユーザーオブジェクトの型定義
export interface User {
  pk: number;
  username: string;
  email: string;
  [key: string]: any; 
}

// 💡 2. Context が提供する値の型定義
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
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

// 💡 通常の関数コンポーネントの記述にして、戻り値を React.ReactElement に確定させます
export const AuthProvider = ({ children }: AuthProviderProps): React.ReactElement => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // タイムアウト処理の重複実行を防ぐフラグ
  const isTimingOutRef = useRef<boolean>(false);
  
  const router = useRouter();
  const pathname = usePathname(); 
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

  // --- CookieからCSRFトークンを取得するヘルパー関数 ---
  const getCsrfToken = (): string | null => {
    if (typeof document === 'undefined') return null; 
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

    const options: RequestInit = {
      method,
      headers,
      credentials: 'include',
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    return options;
  }, []);

  // 3. タイムアウト処理
  const handleSessionTimeout = useCallback((destinationPath: string = '') => {
    if (typeof window === 'undefined') return;

    // 💡 既にタイムアウト処理が走っているなら、即座に何もしないで終了
    if (isTimingOutRef.current) return;
    isTimingOutRef.current = true;

    const currentPath = window.location.pathname;

    if (currentPath === '/login' || currentPath === '/forgot-password' || currentPath.startsWith('/password-reset-confirm')) {
      isTimingOutRef.current = false; // ログイン画面等の場合はフラグを戻す
      return;
    }

    const isAuthRequiredPage = 
      currentPath.startsWith('/cart') || 
      currentPath.startsWith('/checkout') || 
      currentPath.startsWith('/orders') ||
      currentPath.startsWith('/success') || 
      currentPath.startsWith('/cancel');
      destinationPath.startsWith('/cart') ||     // ✨ 追加
      destinationPath.startsWith('/checkout') || // ✨ 追加
      destinationPath.startsWith('/orders');     // ✨ 追加
    
    if (isAuthRequiredPage) {
      alert("タイムアウトによりログアウトされました。");
      setUser(null);
      router.push('/');
    } else {
      setUser(null);
    }

    setTimeout(() => {
      isTimingOutRef.current = false;
    }, 3000);
    
  }, [router]);

  // 4. アプリ全体の401（認証切れ）を中央監視するラッパーFetch関数
  const secureFetch = useCallback(async (url: string, options: RequestInit): Promise<Response> => {
    const res = await fetch(url, options);
    
    if (res.status === 401) {
      console.warn("セッションの有効期限が切れたか、未認証です。自動ログアウトします。");
      handleSessionTimeout('/cart');
      // 💡 エラーを投げず、呼び出し元（UserNavなど）に偽の「失敗レスポンス」を返す
      // これにより、Next.jsの画面クラッシュを防ぎつつ、res.ok = false で判定させます
      return {
        ...res,
        ok: false,
        status: 401,
      } as Response;
    }
    return res;
  }, [handleSessionTimeout]);

  // 1. ユーザーの状態を確認
  const checkUserStatus = useCallback(async () => {
    try {
      const res = await secureFetch(`${apiUrl}/api/auth/user/`, fetchOptions('GET'));
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (error: any) {
      // 💡 タイムアウトエラー(Unauthorized session)なら、すでにhandleSessionTimeout側で
      // 処理されているので、ここでは静かにログだけ出して処理を流します。
      if (error.message === "Unauthorized session") {
        console.log("セッションチェック：タイムアウトを検知したため処理を中断しました。");
      } else {
        console.error("Check status error:", error);
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, fetchOptions, secureFetch]);

  // ページ初期読み込み時のチェック
  useEffect(() => {
    checkUserStatus();
  }, [checkUserStatus]);

  // ページ遷移時の先制セキュリティガード
  useEffect(() => {
    const currentPath = pathname; 

    const isAuthRequiredPage = 
      currentPath.startsWith('/cart') || 
      currentPath.startsWith('/checkout') || 
      currentPath.startsWith('/orders') ||
      currentPath.startsWith('/success') || 
      currentPath.startsWith('/cancel');

    if (isAuthRequiredPage) {
      const verifySessionOnNavigate = async () => {
        try {
          console.log(`💡 ${currentPath} への遷移を検知。セッションの先制チェックを行います...`);
          await secureFetch(`${apiUrl}/api/auth/user/`, fetchOptions('GET'));
        } catch (error: any) {
          if (error.message === "Unauthorized session") {
            console.log("遷移時の先制チェック：タイムアウトを安全にハンドルしました。");
          } else {
            console.error("Navigation session verification failed:", error);
          }
        }
      };
      verifySessionOnNavigate();
    }
  }, [pathname, secureFetch, fetchOptions, apiUrl]);

  // 2. ログイン
  const loginUser = useCallback(async (email: string, password: string): Promise<void> => {
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
  const logoutUser = useCallback(async (): Promise<void> => {
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
  // 💡 【修正点】構文ミスを綺麗に直しました！
  const registerUser = useCallback(async (username: string, password: string, email: string = ""): Promise<void> => {
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