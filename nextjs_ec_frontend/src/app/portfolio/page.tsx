'use client';

import React, { useState } from 'react';
import Image from 'next/image';

// 型定義
interface FeatureItem {
  category: string;
  detail: string;
}

interface RoadmapItem {
  title: string;
  description: string;
}

export function ImageSlider() {
  // 表示する画像のパス一覧
  const slides = [
    'https://res.cloudinary.com/dkzrri8is/image/upload/v1782022788/slide01_bs00w6.jpg',
    'https://res.cloudinary.com/dkzrri8is/image/upload/v1782022788/slide02_pjv5ut.jpg',
    'https://res.cloudinary.com/dkzrri8is/image/upload/v1782022788/slide03_m83gmg.jpg',
    'https://res.cloudinary.com/dkzrri8is/image/upload/v1782022788/slide04_zxnooz.jpg',
    'https://res.cloudinary.com/dkzrri8is/image/upload/v1782022788/slide05_ivjn8v.jpg',
    'https://res.cloudinary.com/dkzrri8is/image/upload/v1782022789/slide06_r1lq2j.jpg',
    'https://res.cloudinary.com/dkzrri8is/image/upload/v1782022788/slide07_cuv1fc.jpg',
  ];

  // 現在何枚目のスライドを表示しているかを管理する状態（0からスタート）
  const [currentIndex, setCurrentIndex] = useState(0);

  // 「前へ」ボタンを押した時の処理
  const prevSlide = () => {
    const isFirstSlide = currentIndex === 0;
    const newIndex = isFirstSlide ? slides.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
  };

  // 「次へ」ボタンを押した時の処理
  const nextSlide = () => {
    const isLastSlide = currentIndex === slides.length - 1;
    const newIndex = isLastSlide ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h3 className="text-lg font-bold text-slate-900 mb-4 text-center">
        プレゼンテーションスライド（全 {slides.length} 枚）
      </h3>
      
      {/* スライド本体の枠 */}
      <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden shadow-lg bg-slate-900 group">
        
        {/* 画像表示エリア */}
        <Image
          src={slides[currentIndex]}
          alt={`スライド ${currentIndex + 1}`}
          fill
          className="object-contain duration-500" // 画像全体を表示し、切り替え時にふわっとさせる
        />

        {/* 左矢印ボタン */}
        <button
          onClick={prevSlide}
          className="absolute top-1/2 -translate-y-1/2 left-5 text-2xl rounded-full p-2 bg-black/30 hover:bg-black/50 text-white transition-colors"
        >
          ❮
        </button>

        {/* 右矢印ボタン */}
        <button
          onClick={nextSlide}
          className="absolute top-1/2 -translate-y-1/2 right-5 text-2xl rounded-full p-2 bg-black/30 hover:bg-black/50 text-white transition-colors"
        >
          ❯
        </button>

        {/* 下部のページネーション（ドット表示） */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
          {slides.map((_, slideIndex) => (
            <button
              key={slideIndex}
              onClick={() => setCurrentIndex(slideIndex)}
              className={`w-3 h-3 rounded-full transition-all ${
                currentIndex === slideIndex ? 'bg-indigo-500 scale-125' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PortfolioPage() {
  const features: FeatureItem[] = [
    { category: '商品管理・検索', detail: 'カテゴリ/ブランド管理、複数条件フィルタリング（FilterContext）、商品比較機能（FloatingCompareBar）、商品の仕様（Specifications）詳細管理' },
    { category: '購入フロー', detail: '動的カート管理（CartContext）、地域別送料自動計算（CSVデータ連動）、Stripe APIを決済フックした注文処理、注文履歴確認' },
    { category: '顧客管理', detail: 'ユーザー評価・投票システム（Comment/Vote）、パスワードリセット、プライバシーポリシー/Cookie同意バナー（GDPR等コンプライアンス対応）' }
  ];

  const shortRoadmap: RoadmapItem[] = [
    { title: 'Next.jsのサーバー/クライアント境界の最適化', description: 'ページ全体を巻き込んでクライアントコンポーネント化（use client）している箇所をリファクタリング。商品名や説明文などの静的コア部分はサーバーサイド（RSC）で高速レンダリング（SEO・LCP向上）させ、「カートに入れる」などインタラクティブな末端部分だけをクライアントコンポーネントに分離する。' },
    { title: 'エラーハンドリングのモダン化', description: '現在 alert() や console.error で処理している暫定実装を、react-hot-toast や sonner を用いたノンブロッキングなトースト通知へ刷新。また、Next.jsの error.js や not-found.js を導入し、存在しない商品IDへアクセスされた際の離脱率を低下させる。' },
    { title: '型安全性の徹底', description: '既存の .jsx コンポーネントを段階的に TypeScript (.tsx) へ移行し、大規模改修時の型崩れによるバグをコンパイル段階で検知する。' }
  ];

  const longRoadmap: RoadmapItem[] = [
    { title: 'SEO・動的メタデータの強化', description: 'app/products/[id]/page.jsx にて generateMetadata を実装。DBから動的に商品名・説明・Cloudinaryの画像URLを取得し、検索エンジンやSNSシェア（Open Graph）に完全最適化させる。' },
    { title: 'API仕様のドキュメント自動化', description: 'drf-spectacular を導入し、OpenAPI 3.0 スキーマおよび Swagger UI を自動生成。フロントエンドとバックエンドのインターフェース共有を効率化する。' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* ヘッダーエリア */}
      <header className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <span className="inline-block px-3 py-1 text-xs font-semibold bg-indigo-500 rounded-full mb-4 tracking-wider uppercase">
            WEBアプリケーション制作実績
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
            フルスタックECサイト ポートフォリオ
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl leading-relaxed">
            モダンなコンポーネント指向フロントエンドと、堅牢なAPIバックエンドを組み合わせた、実運用に耐えうる本格的なEコマースシステムです。
          </p>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        
        {/* 💡 コツ①：メインの視覚的イメージ（メインビジュアル）を最初に入れる */}
        {/* <section className="text-center">
          <div className="relative w-full aspect-[16/9] overflow-hidden rounded-2xl shadow-xl border border-slate-200 bg-white">
            <Image
              src="/images/site01.jpg" // あなたが用意したメインスクショやスライドの画像パス
              alt="ECサイト メインビジュアル"
              fill // 親要素いっぱいに広げる設定
              className="object-cover"
              priority // ページを開いた時に最優先で読み込む設定（SEO・速度向上）
            />
          </div>
        </section>             */}

        {/* プロジェクト概要 */}
        <section className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-xl font-bold text-slate-950 mb-6 flex items-center border-l-4 border-indigo-600 pl-3">
            1. プロジェクト概要
          </h2>

          {/* 💡 ここで先ほどのスライドショーを呼び出すだけ！ */}
          <ImageSlider />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-3">
              <p><span className="font-semibold text-slate-500 block">開発概要</span> 複雑な商品仕様や送料計算、セキュリティ担保を網羅したBtoC向けECサイト</p>
              <p><span className="font-semibold text-slate-500 block">開発期間</span> 約4ヶ月（設計・バックエンド構築・フロントエンド実装・リファクタリング）</p>
            </div>
            <div className="space-y-3">
              <p><span className="font-semibold text-slate-500 block">アーキテクチャ</span> フロントエンドとバックエンドを完全に分離した疎結合なSPA構成</p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <h3 className="font-semibold text-slate-900 mb-3">技術スタック</h3>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-3 py-1.5 bg-slate-100 text-slate-700 font-medium rounded-md">フロントエンド: Next.js (App Router), React</span>
              <span className="px-3 py-1.5 bg-slate-100 text-slate-700 font-medium rounded-md">状態管理: React Context API</span>
              <span className="px-3 py-1.5 bg-slate-100 text-slate-700 font-medium rounded-md">スタイリング: Tailwind CSS</span>
              <span className="px-3 py-1.5 bg-slate-100 text-slate-700 font-medium rounded-md">バックエンド: Python, Django REST Framework</span>
              <span className="px-3 py-1.5 bg-slate-100 text-slate-700 font-medium rounded-md">データベース: PostgreSQL</span>
              <span className="px-3 py-1.5 bg-slate-100 text-slate-700 font-medium rounded-md">インフラ・外部サービス: Stripe, Cloudinary</span>
            </div>
          </div>
        </section>

        {/* 実装機能一覧 */}
        <section className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-xl font-bold text-slate-950 mb-6 flex items-center border-l-4 border-indigo-600 pl-3">
            2. 実装機能一覧
          </h2>
          <div className="overflow-hidden border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 font-semibold text-slate-700 w-1/3">カテゴリ</th>
                  <th className="p-4 font-semibold text-slate-700 w-2/3">実装機能詳細</th>
                </tr>
              </thead>
                <tbody className="divide-y divide-slate-200">
                {features.map((f, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="p-4 font-medium text-slate-900">{f.category}</td>
                    <td className="p-4 text-slate-600 leading-relaxed">{f.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 技術的アピールポイント */}
        <section className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100 space-y-6">
          <h2 className="text-xl font-bold text-slate-950 mb-4 flex items-center border-l-4 border-indigo-600 pl-3">
            3. 技術的アピールポイント（こだわり）
          </h2>

          <div className="space-y-4">
            <div className="p-5 bg-indigo-50/40 rounded-xl border border-indigo-100/50">
              <h3 className="font-bold text-indigo-950 mb-2 text-base">① ベストプラクティスに準拠した強固な認証システム</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-3">
                一般的な個人開発で陥りがちなトークン漏洩リスクを排除するため、実務レベルのセキュリティを実装しました。
              </p>
              <ul className="text-sm text-slate-700 space-y-2 list-disc pl-5 leading-relaxed">
                <li><strong className="text-slate-900">XSS対策（Tokenの隠蔽）:</strong> JWT（アクセストークン）をJavaScriptからアクセス不可能な <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-mono text-xs">HttpOnly / Secureクッキー</code> で管理。フロントエンド側はブラウザ制御のみで完結させ、トークン奪取を物理的に防御。</li>
                <li><strong className="text-slate-900">CSRF対策の同期:</strong> クッキー認証に伴うCSRFリスクに対し、バックエンド側で全リクエストを厳格に検証。フロントエンドから <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-mono text-xs">X-CSRFToken</code> ヘッダーを動的に付与・同期。</li>
                <li><strong className="text-slate-900">トークン・ライフサイクル管理:</strong> アクセストークンを15分の短命に設定。リフレッシュトークンは使用毎にローテーションし、古いトークンは即座にブラックリスト化して不正利用を防止。</li>
              </ul>
            </div>

            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200/60">
              <h3 className="font-bold text-slate-900 mb-2 text-base">② 運用の乱用を防ぐスロットリング（APIレート制限）</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                ブルートフォース攻撃やスクリプトによるAPI乱用を防ぐため、機密性に応じたアクセス制限を施しています。
                未ログインユーザーは1日最大100リクエスト、認証や注文など機密操作は1分間に最大5回までに制限。
              </p>
            </div>

            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200/60">
              <h3 className="font-bold text-slate-900 mb-2 text-base">③ 拡張性とメンテナンス性を重視した設計</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                バックエンドの <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-xs">views/</code> を機能別に細かくモジュール化（疎結合設計）。
                また、26回以上のマイグレーション履歴が示す通り、送料、仕様、評価データなどの実業務に必要な複雑なデータリレーションを正確に構築しています。
              </p>
            </div>
          </div>
        </section>

        {/* 今後の課題と技術的アプローチ */}
        <section className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100 space-y-6">
          <h2 className="text-xl font-bold text-slate-950 mb-2 flex items-center border-l-4 border-indigo-600 pl-3">
            4. 今後の課題と技術的アプローチ
          </h2>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-indigo-600 mb-3">短期ロードマップ（UX・品質向上）</h3>
            <div className="space-y-3">
              {shortRoadmap.map((item, idx) => (
                <div key={idx} className="border-l-2 border-slate-200 pl-4 py-1">
                  <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-indigo-600 mb-3">中長期ロードマップ（本番運用・マーケティング最適化）</h3>
            <div className="space-y-3">
              {longRoadmap.map((item, idx) => (
                <div key={idx} className="border-l-2 border-slate-200 pl-4 py-1">
                  <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>

      {/* フッター */}
      <footer className="bg-slate-900 text-slate-400 py-8 text-center text-xs border-t border-slate-800">
        <p>© 2026 Full-Stack EC Project Portfolio. Built with Next.js & Django.</p>
      </footer>
    </div>
  );
}
