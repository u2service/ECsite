import React from 'react';
import { Metadata } from 'next';

// 💡 静的メタデータを定義して、ブラウザのタブ名やSEO対策を完璧にする
export const metadata: Metadata = {
  title: 'クッキーポリシー (Cookie Policy)',
  description: '当サイトにおけるクッキー（Cookie）の利用目的および設定に関するポリシーをご案内します。',
};

export default function CookiePolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 leading-relaxed text-gray-800">
      <h1 className="text-3xl font-bold mb-8 border-b pb-4 text-gray-900">
        クッキーポリシー
      </h1>
      
      <p className="mb-6">
        当サイトでは、お客様の利便性向上、サイトの利用状況の分析、およびマーケティング活動のためにクッキー（Cookie）を使用しています。本ポリシーでは、当サイトで使用しているクッキーの種類やその目的、および管理方法について説明します。
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">1. クッキー（Cookie）とは</h2>
        <p>
          クッキーとは、ウェブサイトを訪問した際にお客様のブラウザ（PCやスマートフォンなど）に保存される小さなテキストファイルです。これを利用することで、サイトの訪問回数やユーザー設定などの情報を保持することができます。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">2. 使用するクッキーの種類と利用目的</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-gray-900">■ 必須クッキー (Essential Cookies)</h3>
            <p className="text-sm text-gray-600">
              サイトの基本的な機能（ログイン状態の維持、ショッピングカートの保持など）を提供するために不可欠なクッキーです。これを無効にすると、サイトの一部が正しく機能しなくなります。
            </p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">■ パフォーマンス・分析クッキー (Analytics Cookies)</h3>
            <p className="text-sm text-gray-600">
              お客様がどのようにサイトを利用しているか（アクセス数の多いページやエラーの発生状況など）を把握し、サイトの利便性を改善するために利用します。（例: Google Analytics, Vercel Web Analyticsなど）
            </p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">3. クッキーの管理・無効化について</h2>
        <p className="mb-2">
          お客様は、ご利用のブラウザの設定を変更することにより、クッキーの受け入れを拒否したり、保存されたクッキーを削除したりすることができます。
        </p>
        <p className="text-sm text-gray-600">
          ※主要なブラウザごとの設定方法については、各ブラウザの公式ヘルプ（Google Chrome, Apple Safari, Mozilla Firefox, Microsoft Edgeなど）をご確認ください。なお、必須クッキーを無効にした場合、当サイトの一部の機能がご利用いただけなくなることがありますのであらかじめご了承ください。
        </p>
      </section>

      <p className="text-sm text-gray-500 text-right mt-12">
        改定日: 2026年6月24日
      </p>
    </div>
  );
}