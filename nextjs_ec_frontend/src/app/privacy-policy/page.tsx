import React from 'react';

export default function PrivacyPolicyPage(): React.ReactElement {
  return (
    <div className="max-w-4xl mx-auto py-10 px-6 bg-white shadow-sm rounded-lg my-8">
      <h1 className="text-3xl font-bold mb-8 border-b pb-4">プライバシーポリシー</h1>

      <section className="mb-8 text-gray-700 leading-relaxed">
        <p className="mb-4">
          My EC Store（以下、「当社」といいます）は、本ウェブサイト上で提供するサービス（以下、「本サービス」といいます）における、ユーザーの個人情報の取扱いについて、以下のとおりプライバシーポリシーを定めます。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">第1条（個人情報の収集方法）</h2>
        <p className="text-gray-700">
          当社は、ユーザーが会員登録や商品の購入をする際に、氏名、生年月日、住所、電話番号、メールアドレス、クレジットカード番号などの個人情報をお尋ねすることがあります。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">第2条（個人情報を収集・利用する目的）</h2>
        <p className="text-gray-700 mb-2">当社が個人情報を収集・利用する目的は、以下のとおりです。</p>
        <ol className="list-decimal ml-6 text-gray-700 space-y-1">
          <li>当社商品の発送、代金決済のため</li>
          <li>ユーザーからのお問い合わせに対応するため（本人確認を行うことを含む）</li>
          <li>ユーザーが利用中のサービスの更新情報、キャンペーン等をご案内するため</li>
          <li>利用規約に違反したユーザーや、不正・不当な目的でサービスを利用しようとするユーザーの特定をおこない、ご利用をお断りするため</li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">第3条（個人情報の第三者提供）</h2>
        <p className="text-gray-700">
当社は、次に掲げる場合を除いて、あらかじめユーザーの同意を得ることなく、第三者に個人情報を提供することはありません。ただし、個人情報保護法その他の法令で認められる場合（商品の配送を委託会社へ依頼する場合
など）を除きます。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">第4条（お問い合わせ窓口）</h2>
        <p className="text-gray-700 mb-2">本ポリシーに関するお問い合わせは、下記の窓口までお願いいたします。</p>
        <div className="bg-gray-50 p-4 rounded border">
          <ul className="text-sm space-y-1">
            <li><strong>住所：</strong>東京都...（実際の住所を入力）</li>
            <li><strong>社名/店舗名：</strong>My EC Store</li>
            <li><strong>担当部署：</strong>カスタマーサポート係</li>
            <li><strong>Eメールアドレス：</strong>support@example.com</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
