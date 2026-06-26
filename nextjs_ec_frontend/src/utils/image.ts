export const getFullImageUrl = (path: string | null | undefined): string => {
  if (!path) return '/placeholder.png';
  
  // 💡 環境変数が未定義の場合の空文字フォールバックを念のため追加
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  
  return path.startsWith('http') ? path : `${apiUrl}${path}`;
};