"use client";

import { useRouter } from 'next/navigation';

export default function FloatingCompareBar({ checkedCount, checkedIds, onClear }) {
  const router = useRouter();

  // 比較ページへ遷移する処理
  const handleCompare = () => {
    // IDをカンマ区切りでURLパラメータにする (例: ?ids=1,2,3)
    const idsQuery = checkedIds.join(',');
    router.push(`/compare?ids=${idsQuery}`);
    
    // 遷移と同時にチェックをクリアする場合
    // onClear(); 
  };

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md">
      <div className="bg-blue-600 text-white shadow-2xl rounded-2xl p-4 flex items-center justify-between animate-in fade-in slide-in-from-bottom-4 duration-300">
        
        {/* 左側：件数表示 */}
        <div className="flex flex-col">
          <span className="text-sm font-medium opacity-90">選択中</span>
          <span className="text-xl font-bold">{checkedCount} <span className="text-sm">件</span></span>
        </div>

        {/* 右側：ボタンエリア */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClear}
            className="text-sm text-white/80 hover:text-white underline px-2"
          >
            クリア
          </button>
          
          <button
            onClick={handleCompare}
            className="bg-white text-blue-600 px-6 py-2.5 rounded-xl font-bold hover:bg-gray-100 transition-colors shadow-sm"
          >
            比較する
          </button>
        </div>
      </div>
    </div>
  );
}
