"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

// ==========================================
// 💡 型定義（Interfaces）
// ==========================================
export interface Comment {
  id: number;
  user_name: string;
  created_at: string;
  content: string;
  good_count: number;
  ng_count: number;
  current_user_vote: 'good' | 'ng' | null; // ログインユーザーの投票状態
}

interface CommentItemProps {
  comment: Comment;
  onVoteUpdate: (updatedComment: Comment) => void;
}

// 投票可能なタイプを制限（文字列リテラル型）
type VoteType = 'good' | 'ng';

// ==========================================
// 📄 メインコンポーネント
// ==========================================
export default function CommentItem({ comment, onVoteUpdate }: CommentItemProps): React.ReactElement {
  const { user, fetchOptions } = useAuth();
  const [isVoting, setIsVoting] = useState<boolean>(false);

  // 日付のフォーマット (例: 2026/06/25 15:30)
  const formattedDate = new Date(comment.created_at).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  // 💡 引数の型を VoteType に縛ることでタイポを完全に防止
  const handleVote = async (voteType: VoteType) => {
    if (!user) {
      alert("投票するにはログインが必要です");
      return;
    }
    if (isVoting) return;

    setIsVoting(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/comments/${comment.id}/vote/`,
        fetchOptions('POST', { vote_type: voteType })
      );

      if (res.ok) {
        const updatedComment: Comment = await res.json();
        onVoteUpdate(updatedComment);
      } else {
        console.error("Vote failed with status:", res.status);
      }
    } catch (error) {
      console.error("Vote error:", error);
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className="border-b border-gray-100 py-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <span className="font-bold text-gray-800">{comment.user_name}</span>
          <span className="ml-4 text-xs text-gray-500">{formattedDate}</span>
        </div>
      </div>
      <p className="text-gray-700 whitespace-pre-wrap mb-3">{comment.content}</p>

      <div className="flex space-x-4">
        {/* 👍 ボタン */}
        <button
          onClick={() => handleVote('good')}
          disabled={isVoting}
          className={`flex items-center space-x-1 text-sm px-2 py-1 rounded transition-colors focus:outline-none ${
            comment.current_user_vote === 'good'
              ? 'bg-blue-100 text-blue-600 font-semibold'
              : 'hover:bg-gray-100 text-gray-500'
          }`}
        >
          <span>👍</span>
          <span>{comment.good_count}</span>
        </button>

        {/* 👎 ボタン */}
        <button
          onClick={() => handleVote('ng')}
          disabled={isVoting}
          className={`flex items-center space-x-1 text-sm px-2 py-1 rounded transition-colors focus:outline-none ${
            comment.current_user_vote === 'ng'
              ? 'bg-red-100 text-red-600 font-semibold'
              : 'hover:bg-gray-100 text-gray-500'
          }`}
        >
          <span>👎</span>
          <span>{comment.ng_count}</span>
        </button>
      </div>
    </div>
  );
}