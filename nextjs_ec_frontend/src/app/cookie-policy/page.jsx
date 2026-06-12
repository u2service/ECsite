export default function CookiePolicyPage() {
  return (
    <div className="max-w-4xl mx-auto py-10 px-6 bg-white shadow-sm rounded-lg my-8 text-gray-700">
      <h1 className="text-3xl font-bold mb-8 border-b pb-4 text-black">Cookieポリシー（情報の外部送信について）</h1>

      <p className="mb-8">
        当社は、お客様のウェブサイト利用状況を分析し、または個々のお客様に対してカスタマイズされたサービス・広告を提供するため、Cookie（クッキー）等の技術を使用して一定の情報を外部へ送信しています。
      </p>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4 text-black">1. ウェブサイトの動作に不可欠なCookie</h2>
        <p className="mb-4">
当社サイトでは、お客様のログイン状態の維持、ショッピングカートの保持、およびCSRF（クロスサイトリクエストフォージェリ）等のサイバー攻撃からサイトを守るためのセキュリティ対策として、必須Cookieを使用してい
ます。これらはサイトの動作に不可欠なため、無効にすることはできません。
        </p>
        <div className="bg-gray-50 p-4 rounded border text-sm">
          <strong>送信先：</strong>自社サーバー（django_ec_backend）
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4 text-black">2. 外部に送信される情報の一覧</h2>
        <p className="mb-4">当社サイトでは、利便性向上や広告配信のために以下の外部ツールを導入しており、Cookie等を通じてユーザー情報が自動的に各事業者に送信されます。</p>

        <div className="space-y-6">
          <div className="border-l-4 border-blue-500 pl-4 py-2">
            <h3 className="font-bold">Google Analytics（Google LLC）</h3>
            <ul className="text-sm mt-2 space-y-1">
              <li><strong>利用目的：</strong>サイトのアクセス解析・利用状況の把握のため</li>
              <li><strong>送信される情報：</strong>閲覧履歴、滞在時間、ブラウザや端末の情報</li>
              <li><strong>オプトアウト：</strong><a href="https://tools.google.com/dlpage/gaoptout" target="_blank" className="text-blue-600 underline">Googleアナリティクス オプトアウトアドオン</a></li>
            </ul>
          </div>

          <div className="border-l-4 border-green-500 pl-4 py-2">
            <h3 className="font-bold">Google AdSense / Google広告（Google LLC）</h3>
            <ul className="text-sm mt-2 space-y-1">
              <li><strong>利用目的：</strong>お客様の興味・関心に合わせた最適な広告配信のため</li>
              <li><strong>送信される情報：</strong>広告の閲覧履歴、サイト内の行動履歴</li>
              <li><strong>オプトアウト：</strong><a href="https://adssettings.google.com/" target="_blank" className="text-blue-600 underline">Google広告設定</a></li>
            </ul>
          </div>

          <div className="border-l-4 border-blue-800 pl-4 py-2">
            <h3 className="font-bold">Metaピクセル（Meta Platforms, Inc.）</h3>
            <ul className="text-sm mt-2 space-y-1">
              <li><strong>利用目的：</strong>広告の効果測定および広告配信のため</li>
              <li><strong>送信される情報：</strong>購入完了などのアクション情報</li>
              <li><strong>オプトアウト：</strong><a href="https://www.facebook.com/ads/preferences/" target="_blank" className="text-blue-600 underline">Facebook広告設定</a></li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4 text-black">3. Cookieの管理・削除方法</h2>
        <p>お客様は、ブラウザの設定を変更することにより、Cookieの受け入れを拒否したり、保存されたCookieを削除したりすることができます。ただし、すべてのCookieをブロックした場合、当サイトでのログインや商品の購入（カ
ート機能）が正しく動作しなくなりますのでご注意ください。
        </p>
      </section>
    </div>
  );
}
