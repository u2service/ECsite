  # フルスタックECプラットフォーム (Next.js × Django REST Framework)

  Next.js (App Router) と Django REST Framework (DRF) を分離構成で構築した、実践的なフルスタックECサイトのポートフォリオです。
  実務を意識した「セキュアな認証設計」「型安全なAPI連携」「在庫排他制御」「E2Eテストによる品質担保」に重点を置いて開発しました。

  ---

  ## 🌐 デモサイト・主要リンク

  - **フロントエンド デモ**: https://your-frontend-domain.vercel.app *(※デモURLがあれば記載)*
  - **API仕様書 (Swagger/OpenAPI)**: `/api/schema/swagger-ui/` *(または公開URL)*
  - **テスト用アカウント**:
    - 一般ユーザー: `testuser@example.com` / `password123`
    - 管理者ユーザー: `admin@example.com` / `adminpassword123`

  ---

  ## 🛠 技術スタック

  ### フロントエンド
  - **Framework**: Next.js 15+ (App Router) / React 19 / TypeScript
  - **Styling**: Tailwind CSS v4
  - **State / UI**: React Context API, Sonner (Toast通知)
  - **API連携 / 型生成**: `openapi-typescript` (DRFスキーマからの自動型生成)
  - **決済連携**: Stripe Elements (`@stripe/stripe-js`)
  - **テスト**:
    - ユニット/コンポーネントテスト: Vitest, React Testing Library
    - E2Eテスト: Playwright (Chromium)
  - **ホスティング**: Vercel

  ### バックエンド
  - **Framework**: Python 3.12+ / Django 5.x / Django REST Framework
  - **認証**: dj-rest-auth + django-allauth + djangorestframework-simplejwt (HttpOnly Cookie による JWT 認証)
  - **データベース**: PostgreSQL (本番) / SQLite (ローカル開発)
  - **カテゴリ管理**: django-mptt (階層構造・ツリー構造の最適化)
  - **ストレージ**: Cloudinary (画像・メディア管理)
  - **決済**: Stripe API
  - **APIドキュメント**: drf-spectacular (OpenAPI 3.0 自動生成)
  - **テスト**: Django Test Runner / TestCase (単体・統合・セキュリティテスト)

  ---

  ## 🌟 実装機能一覧

  - **商品関連**
    - 商品一覧・詳細・カテゴリ別絞り込み・検索
    - 商品スペック比較機能 (Compare機能)
  - **ショッピングカート & 決済**
    - カート内商品の数量変更・削除
    - Stripe を用いたクレジットカード決済フロー
    - **注文確定時の在庫排他制御**（同時注文時の在庫不整合防止）
  - **認証 & ユーザー管理**
    - サインアップ・ログイン・ログアウト
    - パスワードリセット（トークン送信フロー）
    - 注文履歴一覧・明細確認
  - **管理機能**
    - Django Admin をカスタマイズした在庫・注文・商品階層管理

  ---

  ## 💎 技術的なこだわり・工夫した点（アピールポイント）

  ### 1. セキュリティを最重視した JWT 認証基盤 (HttpOnly Cookie)
  JavaScript からアクセストークンを直接読み取れないよう、JWT を **`HttpOnly` かつ `SameSite` / `Secure` な Cookie** でやり取りする設計を採用しました。これにより、フロントエンド側の XSS
  脆弱性を突かれた場合でもトークンの窃取を防ぎ、CSRF トークン検証と組み合わせることで強固なセキュリティを担保しています。

  ### 2. スキーマ駆動開発によるフロントエンドの型安全性
  バックエンド（drf-spectacular）から OpenAPI スキーマ（`schema.yml`）を生成し、フロントエンド側で `openapi-typescript`
  を用いて型定義を自動同期しています。これにより、バックエンド側のAPI仕様変更がフロントエンドの型エラーとして即座に検知され、安全で手戻りの少ない開発フローを実現しました。

  ### 3. トランザクションと在庫競合（排他制御）の考慮
  複数ユーザーが同時に最後の1点を決済しようとした場合を想定し、データベーストランザクションおよび適切なロック機構を意識した在庫引き当てロジックを実装。また、Playwright
  を用いて「在庫競合時に適切にエラーハンドリングされ、カート側へフィードバックされるか」のシナリオテスト（`2-stock-conflict.spec.ts`）を自動化しています。

  ### 4. 多層的なテスト構成（Unit / Integration / E2E）
  - **バックエンド**: モデルのバリデーション、注文・決済フロー、認証・権限チェックを網羅した自動テスト（`test_api.py`, `test_auth_security.py`, `test_checkout.py`）。
  - **フロントエンド**: Vitest によるユーティリティ・コンポーネントテストに加え、ユーザーの主要な購買体験（商品閲覧〜決済完了の Happy Path、在庫競合、商品比較）を Playwright で E2E 自動テスト化。

  ---

  ## 🏗 システム構成図

```mermaid
graph TD
    %% クライアント層
    subgraph Client ["Client / Browser"]
        User["User Browser"]
        Auth["dj-rest-auth<br>(HttpOnly JWT)"]
    end

    %% 外部サービス層
    subgraph External ["External Services"]
        Stripe["Stripe (Payments)"]
        Cloudinary["Cloudinary (Images)"]
    end

    %% フロントエンド層
    subgraph Frontend ["Next.js (App Router / React 19 / TS)"]
        AppRouter["App Router / Proxy"]
        StripeElements["Stripe Elements"]
    end

    %% バックエンド層 (Django)
    subgraph Backend ["Django (REST Framework)"]
        API["DRF API Endpoints"]
    end

    %% データベース層
    subgraph Database ["Database"]
        DB[(PostgreSQL)]
    end

    %% 接続関係
    User -->|HTTPS / HttpOnly Cookie| AppRouter
    AppRouter -->|REST API / Bearer or Cookie| API
    API <-->|SQL Queries| DB

    %% 認証・外部連携
    Auth -.->|Token / Cookie| AppRouter
    StripeElements -->|Payment Request| Stripe
    API -->|Image Upload / Media| Cloudinary                     
```

  ---

  ## 🚀 ローカル環境の立ち上げ手順

  ### 前提条件
  - Node.js 20+ (または 24.x)
  - Python 3.12+

  ### 1. リポジトリのクローン
  ```bash
  git clone https://github.com/your-username/Http0206.git
  cd Http0206
  ```

  ### 2. バックエンドのセットアップ
  ```bash
  cd django_ec_backend
  python -m venv .venv

  # Windows の場合
  .venv\Scripts\activate
  # Mac / Linux の場合
  # source .venv/bin/activate

  pip install -r requirements.txt
  python manage.py migrate
  python manage.py runserver 8000
  ```
  *(※必要に応じて `.env` に Stripe APIキーやデータベース設定を記述してください)*

  ### 3. フロントエンドのセットアップ
  ```bash
  cd ../nextjs_ec_frontend
  npm install
  npm run dev
  ```
  ブラウザで `http://localhost:3000` にアクセスしてください。

  ### 4. テストの実行

  - **バックエンドテスト**:
    ```bash
    cd django_ec_backend
    python manage.py test products.tests
    ```

  - **フロントエンド ユニットテスト**:
    ```bash
    cd nextjs_ec_frontend
    npm run test
    ```

  - **E2E テスト (Playwright)**:
    ```bash
    cd nextjs_ec_frontend
    npx playwright test
    ```
