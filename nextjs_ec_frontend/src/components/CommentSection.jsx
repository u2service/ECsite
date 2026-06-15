"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import CommentItem from './CommentItem';

export default function CommentSection({ productId }) {
  const { user, fetchOptions } = useAuth();
  const [comments, setComments] = useState([]);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  // コメント一覧を取得
  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/comments/?product_id=${productId}`, {
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (error) {
      console.error("Failed to fetch comments:", error);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, productId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // コメントを投稿
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/api/comments/`, fetchOptions('POST', {
        product: productId,
        content: content
      }));

      if (res.ok) {
        const newComment = await res.json();
        setComments([newComment, ...comments]); // リストの先頭に追加
        setContent(''); // フォームを空に
      } else {
        alert("コメントの投稿に失敗しました。");
      }
    } catch (error) {
      console.error("Submit error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 投票結果を反映
  const handleVoteUpdate = (updatedComment) => {
    setComments(comments.map(c => c.id === updatedComment.id ? updatedComment : c));
  };

  if (loading) return <div className="mt-8 text-center text-gray-500">コメントを読み込み中...</div>;

  return (
    <div className="mt-16 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      <h2 className="text-2xl font-bold mb-6 flex items-center">
        <span className="mr-2">💬</span> コメント ({comments.length})
      </h2>

      {/* 投稿フォーム */}
      {user ? (
        <form onSubmit={handleSubmit} className="mb-10">
          <textarea
            className="w-full p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            rows="3"
            placeholder="商品についての感想を書き込んでください..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isSubmitting}
          />
          <div className="mt-2 text-right">
            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors disabled:bg-gray-400"
            >
              {isSubmitting ? "投稿中..." : "コメントを投稿する"}
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-gray-50 p-4 rounded-lg text-center mb-10">
          <p className="text-gray-600">
            コメントを投稿するには <a href="/login" className="text-blue-600 hover:underline">ログイン</a> が必要です。
          </p>
        </div>
      )}

      {/* コメント一覧 */}
      <div className="space-y-2">
        {comments.length > 0 ? (
          comments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onVoteUpdate={handleVoteUpdate}
            />
          ))
        ) : (
          <p className="text-center text-gray-400 py-10">まだコメントはありません。</p>
        )}
      </div>
    </div>
  );
}
