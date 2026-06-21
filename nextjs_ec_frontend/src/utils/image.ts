export const getFullImageUrl = (path: string | null | undefined): string => {
  if (!path) return '/placeholder.png';
  return path.startsWith('http') ? path : `${process.env.NEXT_PUBLIC_API_URL}${path}`;
};
