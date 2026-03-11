# Requirements Document

## Intent Analysis

| Item | Value |
|---|---|
| **User Request** | TODO Web アプリの新規構築 |
| **Request Type** | New Project |
| **Scope** | Multiple Components（Frontend + Backend + Infrastructure） |
| **Complexity** | Moderate |
| **Requirements Depth** | Standard |

## Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19 + Vite + TypeScript |
| **UI Styling** | Tailwind CSS v4 |
| **Backend** | Hono (TypeScript) on AWS Lambda |
| **Database** | Amazon DynamoDB |
| **Infrastructure** | AWS CDK (TypeScript) |
| **API Gateway** | Amazon API Gateway (REST or HTTP API) |
| **Static Hosting** | Amazon S3 + CloudFront |
| **Package Manager** | pnpm |
| **Linting/Formatting** | Biome |
| **Testing** | Vitest |

## Functional Requirements

### FR-001: TODO 作成
- ユーザーは TODO アイテムを作成できる
- 必須フィールド: タイトル（title）
- オプションフィールド: 説明（description）
- 作成時に一意の ID と作成日時が自動付与される

### FR-002: TODO 一覧表示
- ユーザーはすべての TODO アイテムを一覧で確認できる
- 各アイテムにはタイトル、完了状態、作成日時が表示される

### FR-003: TODO 更新
- ユーザーは TODO アイテムのタイトル、説明を編集できる
- ユーザーは TODO アイテムの完了状態を切り替えられる（完了/未完了）

### FR-004: TODO 削除
- ユーザーは TODO アイテムを削除できる

## Non-Functional Requirements

### NFR-001: パフォーマンス
- API レスポンスタイム: 500ms 以内（コールドスタート除く）
- フロントエンド初回ロード: 3秒以内

### NFR-002: 可用性
- AWS マネージドサービスの SLA に準拠

### NFR-003: セキュリティ
- 認証なし（デモ用途）
- API Gateway で CORS を適切に設定
- 入力バリデーションを API レベルで実施

### NFR-004: 開発体験
- TypeScript strict mode
- Biome によるコード品質管理
- Vitest による自動テスト
- pnpm monorepo 構成（検討）

## Data Model

### TODO Item

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | String (ULID) | Yes | 一意の識別子 |
| `title` | String | Yes | TODO のタイトル（最大 200 文字） |
| `description` | String | No | TODO の詳細説明（最大 1000 文字） |
| `completed` | Boolean | Yes | 完了状態（デフォルト: false） |
| `createdAt` | String (ISO 8601) | Yes | 作成日時 |
| `updatedAt` | String (ISO 8601) | Yes | 更新日時 |

### DynamoDB Table Design

| Attribute | Type | Key |
|---|---|---|
| `id` | String | Partition Key (PK) |

## API Design

### Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/todos` | TODO 作成 |
| `GET` | `/api/todos` | TODO 一覧取得 |
| `GET` | `/api/todos/:id` | TODO 個別取得 |
| `PUT` | `/api/todos/:id` | TODO 更新 |
| `DELETE` | `/api/todos/:id` | TODO 削除 |

## Architecture Overview

```
+------------------+     +-------------------+     +------------------+
|                  |     |                   |     |                  |
|   React + Vite   +---->+  API Gateway      +---->+  Lambda (Hono)   |
|   (S3+CloudFront)|     |  (HTTP API)       |     |                  |
|                  |     |                   |     +--------+---------+
+------------------+     +-------------------+              |
                                                            v
                                                  +------------------+
                                                  |                  |
                                                  |    DynamoDB      |
                                                  |                  |
                                                  +------------------+
```

## Out of Scope
- ユーザー認証・認可
- カテゴリ分類・タグ
- 優先度設定
- 期限管理
- 検索・フィルター
- チーム共有
- 通知機能
