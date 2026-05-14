"use client";
import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const pathname = usePathname(); // 現在のパスを取得

  // --- 追加: CookieからCSRFトークンを取得するヘルパー関数 ---
  const getCsrfToken = () => {
    if (typeof document === 'undefined') return null; // SSR対策
    const value = `; ${document.cookie}`;
    const parts = value.split(`; csrftoken=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };

  // 共通の fetch オプション（Cookieを扱うための設定）
  const fetchOptions = useCallback((method, body = null) => {
    const headers = { 'Content-Type': 'application/json' };
    
    // GET以外（POST, PUT, DELETE等）の場合はCSRFトークンをセット
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
  }, []); // 依存関係はないため空配列でOK


  // 1. ユーザーの状態を確認
  const checkUserStatus = useCallback(async () => {
    try {
      // dj-rest-auth 標準のユーザー情報取得エンドポイントは /api/auth/user/
      const res = await fetch(`${apiUrl}/api/auth/user/`, fetchOptions('GET'));
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
      } else {
        // 以前はログインしていたのに、401（認証エラー）になった場合
        if (user && res.status === 401) {
          setUser(null);
          // クエリパラメータを付けてログイン画面へリダイレクト
          router.push('/login?timeout=true');
        } else {
          setUser(null);
        }
      }
    } catch (error) {
      console.error("Check status error:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, fetchOptions, user, router]); // user と router を依存関係に追加

  // ページ遷移のたびにチェックを実行する useEffect を追加
  useEffect(() => {
    checkUserStatus();
  }, []);

  // 2. ログイン
  const loginUser = useCallback(async (email, password) => {
    try {
      const res = await fetch(`${apiUrl}/api/auth/login/`, fetchOptions('POST', {
        email, password }));
      if (res.ok) {
        const data = await res.json();
        // dj-rest-auth のレスポンスに含まれる user オブジェクトをセット
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
  // SignUpPage の中で使う registerUser 関数を定義
  const registerUser = useCallback(async (username, password, email = "") => {
    try {
      const res = await fetch(
        `${apiUrl}/api/auth/registration/`, 
        fetchOptions('POST', { username, password, email })
      );

      if (res.ok) {
        console.log('会員登録成功！続けてログインします...');

        // ★ポイント：登録が成功したら、そのままログイン関数を叩く！
        await loginUser(email, password);

        // loginUserの中で router.push('/') をしているので、ここでは書かなくてOK
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
    <AuthContext.Provider value={{ user, loading, loginUser, logoutUser, registerUser, fetchOptions }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
