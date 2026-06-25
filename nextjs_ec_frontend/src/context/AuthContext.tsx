"use client";
import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

// 💡 1. ユーザーオブジェクトの型定義
interface User {
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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // 💡 ① タイムアウト処理の重複実行を防ぐフラグ（useRef）
  const isTimingOutRef = useRef<boolean>(false);
  
  const router = useRouter();
  // 💡 ここで現在のパス（/cart など）をリアルタイムに監視します
  const pathname = usePathname(); 
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

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

    return {
      method,
      headers,
      credentials: 'include',
      ...(body && { body: JSON.stringify(body) }),
    };
  }, []);

  // 💡 3. タイムアウト処理（特定のログイン必須画面のみアラートを出してトップへ避難）
  const handleSessionTimeout = useCallback(() => {
    if (typeof window === 'undefined') return;

    const currentPath = window.location.pathname;

    // 🚨 安全ガード1: ログイン画面やパスワードリセット画面なら即終了（ループ防止）
    if (currentPath === '/login' || currentPath === '/forgot-password' || currentPath.startsWith('/password-reset-confirm')) {
      return;
    }

    // 🚨 安全ガード2: すでに別API経由でタイムアウトアラート表示中なら重複させない
    if (isTimingOutRef.current) {
      return;
    }
    
    // フラグをロック
    isTimingOutRef.current = true;

    // ログイン必須ページかどうかの判定（カート、決済、成功、失敗画面）
    const isAuthRequiredPage = 
      currentPath.startsWith('/cart') || 
      currentPath.startsWith('/checkout') || 
      currentPath.startsWith('/orders') ||
      currentPath.startsWith('/success') || 
      currentPath.startsWith('/cancel');

    if (isAuthRequiredPage) {
      // ① ログイン必須画面の場合は、ポップアップでお知らせしてトップへ戻す
      alert("タイムアウトによりログアウトされました。");
      setUser(null);
      router.push('/');
    } else {
      // ② それ以外の一般画面（商品一覧や詳細など）なら、アラートは出さずに静かに状態だけクリア
      setUser(null);
    }

    // 処理が落ち着いた後にフラグをゆっくり戻す
    setTimeout(() => {
      isTimingOutRef.current = false;
    }, 1000);
    
  }, [router]);

  // 💡 4. アプリ全体の401（認証切れ）を中央監視するラッパーFetch関数
  const secureFetch = useCallback(async (url: string, options: RequestInit): Promise<Response> => {
    const res = await fetch(url, options);
    
    // バックエンドが「認証なし(401)」を返してきたら即座にタイムアウト処理をキック
    if (res.status === 401) {
      console.warn("セッションの有効期限が切れたか、未認証です。自動ログアウトします。");
      handleSessionTimeout();
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

  // 💡 🌟 ページ遷移時の先制セキュリティガード
  // カート画面や決済画面を開いた「その瞬間」に、裏でトークンの有効性を強制チェックします
  useEffect(() => {

    // 💡 window.location.pathname の代わりに、Next.js公式の pathname を使用
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
        } catch (error) {
          console.error("Navigation session verification failed:", error);
        }
      };
      verifySessionOnNavigate();
    }
  }, [pathname, secureFetch, fetchOptions, apiUrl]); // 💡 依存配列に pathname を入れることで、ページ移動の瞬間に確実に実行されます

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