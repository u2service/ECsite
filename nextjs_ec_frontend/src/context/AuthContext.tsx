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
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  // 💡 1. ファイル内の `fetchOptions` の上に、Cookie取得用の関数を追加します
  const getCookie = (name: string): string => {
    if (typeof document === 'undefined') return ''; // SSR（サーバーサイドレンダリング）対策
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || '';
    return '';
  };

  // 💡 fetchOptionsの共通化
  const fetchOptions = useCallback((method: string, body?: any): RequestInit => {
        // GETやHEADなどの安全なメソッドの時はCSRFトークンは不要ですが、
    // POST/PUT/DELETEなどの時にCookieからトークンを取得してセットします
    const csrfToken = ['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method.toUpperCase())
      ? ''
      : getCookie('csrftoken');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // CSRFトークンが存在すればヘッダーに追加する
    if (csrfToken) {
      headers['X-CSRFToken'] = csrfToken;
    }

    const options: RequestInit = {
      method,
      headers,
      credentials: 'include', // HttpOnlyクッキー（JWT）をバックエンドへ自動送信
    };
    if (body) options.body = JSON.stringify(body);
    return options;
  }, []);

  // 💡 1. 初期マウント時のユーザーセッション確認（AbortControllerを導入）
  useEffect(() => {
    const abortController = new AbortController();

    const fetchUser = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/auth/user/`, {
          ...fetchOptions('GET'),
          signal: abortController.signal
        });
        if (res.ok) {
          const data = await res.json();
          if (!abortController.signal.aborted) {
            setUser(data);
          }
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Fetch user error:', error);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchUser();

    return () => {
      abortController.abort(); // アンマウント時に未完了のセッション確認を安全に遮断
    };
  }, [apiUrl, fetchOptions]);

  // 💡 2. タイムアウト時の自動ログアウト処理
  const handleSessionTimeout = useCallback(() => {
    if (isTimingOutRef.current) return;
    isTimingOutRef.current = true;
    
    setUser(null);
    router.push('/login?timeout=true');
    
    setTimeout(() => {
      isTimingOutRef.current = false;
    }, 1000);
  }, [router]);

  // 💡 未ログイン時にも裏で走り続けないように依存配列と条件を最適化
  useEffect(() => {
    // 💡 【修正】未ログイン状態なら、セッション切れの監視イベントを仕込む必要はありません！
    if (!user) return;

    const handleTimeoutEvent = () => handleSessionTimeout();
    window.addEventListener('auth-session-timeout', handleTimeoutEvent);
    
    return () => {
      window.removeEventListener('auth-session-timeout', handleTimeoutEvent);
    };
  }, [user, handleSessionTimeout]); // 💡 user の状態を正しく追跡

  // 💡 401エラー（認証切れ）を検知してカスタムイベントを飛ばすインターセプター
  const secureFetch = useCallback(async (url: string, options: RequestInit): Promise<Response> => {
    try {
      const res = await fetch(url, options);
      if (res.status === 401 || res.status === 403) {
        window.dispatchEvent(new CustomEvent('auth-session-timeout'));
      }
      return res;
    } catch (error) {
      throw error;
    }
  }, []);

  // ログイン処理
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

  // ログアウト処理
  const logoutUser = useCallback(async (): Promise<void> => {
    try { await fetch(`${apiUrl}/api/auth/logout/`, fetchOptions('POST')); } 
    catch (error) { console.error('Logout error:', error); } 
    finally { setUser(null); router.push('/login'); }
  }, [apiUrl, fetchOptions, router]);

  // 会員登録処理
  const registerUser = useCallback(async (username: string, password: string, email: string = ""): Promise<void> => {
    try {
      const res = await fetch(`${apiUrl}/api/auth/registration/`, fetchOptions('POST', { username, password, email }));
      if (res.ok) {
        await loginUser(email, password);
      } else {
        toast.error('登録に失敗しました。');
      }
    } catch (error) { console.error('登録エラー:', error); }
  }, [apiUrl, fetchOptions, loginUser]);

  return (
    <AuthContext.Provider value={{ user, loading, loginUser, logoutUser, registerUser, fetchOptions, secureFetch }}>
      {children}
    </AuthContext.Provider>
  );
};