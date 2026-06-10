# Components

> **Note**: 本ドキュメントは v1（初期構築時）の記録です。最新の設計の正は `org-ai-kb/aidlc-docs/intent-001-refactor-todo-app/` 配下を参照してください。

## Component Overview

| Component | Package | Purpose |
|---|---|---|
| **TodoApp** | frontend | React SPA のルートコンポーネント |
| **TodoList** | frontend | TODO 一覧の表示・管理 |
| **TodoItem** | frontend | 個別 TODO アイテムの表示・操作 |
| **TodoForm** | frontend | TODO 作成専用フォーム（編集は TodoItem のインライン編集） |
| **TodoAPI** | frontend | Backend API との通信レイヤー |
| **TodoRouter** | backend | Hono ルーター（REST API エンドポイント定義） |
| **TodoHandler** | backend | リクエストハンドラー（バリデーション・レスポンス） |
| **TodoRepository** | backend | DynamoDB データアクセスレイヤー |
| **TodoStack** | infrastructure | AWS CDK メインスタック |

## Component Details

### Frontend Components

#### TodoApp
- **Purpose**: アプリケーションのルートコンポーネント
- **Responsibilities**:
  - TODO データの state 管理（useState）
  - API 呼び出しの制御（useEffect）
  - 子コンポーネントへの props 配布

#### TodoList
- **Purpose**: TODO アイテムの一覧表示
- **Responsibilities**:
  - TODO 配列の描画
  - 空状態の表示

#### TodoItem
- **Purpose**: 個別 TODO アイテムの表示と操作
- **Responsibilities**:
  - タイトル・完了状態の表示
  - 完了トグルの操作
  - 削除ボタンの操作
  - 編集モードの切り替え

#### TodoForm
- **Purpose**: TODO の新規作成専用フォーム（編集は TodoItem のインライン編集 UI が担う — RF-22① 現状一致）
- **Responsibilities**:
  - タイトル・説明の入力フォーム
  - フォームバリデーション（空欄チェック）
  - 送信処理

#### TodoAPI
- **Purpose**: Backend REST API との通信
- **Responsibilities**:
  - fetch によるHTTPリクエスト送信
  - レスポンスのパース
  - エラーハンドリング

### Backend Components

#### TodoRouter
- **Purpose**: REST API エンドポイントのルーティング定義
- **Responsibilities**:
  - 5つのエンドポイントのルート定義
  - ミドルウェアの適用（CORS, ログ）

#### TodoHandler
- **Purpose**: リクエストの処理とレスポンス生成
- **Responsibilities**:
  - リクエストボディのバリデーション
  - Repository の呼び出し
  - HTTP レスポンスの生成

#### TodoRepository
- **Purpose**: DynamoDB テーブルとのデータ操作
- **Responsibilities**:
  - CRUD 操作の実装（PutItem, GetItem, Scan, UpdateItem, DeleteItem）
  - DynamoDB クライアントの管理
  - データ型の変換

### Infrastructure Components

#### TodoStack
- **Purpose**: AWS リソースの定義（CDK）
- **Responsibilities**:
  - DynamoDB テーブルの作成
  - Lambda 関数の作成
  - API Gateway の設定
  - S3 バケット + CloudFront ディストリビューションの設定
  - IAM ロール・ポリシーの設定
