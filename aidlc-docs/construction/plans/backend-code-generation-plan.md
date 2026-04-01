# Backend Code Generation Plan

## Unit Context

| Property | Value |
|---|---|
| **Unit** | backend |
| **Package Path** | `packages/backend/` |
| **Framework** | Hono (TypeScript) |
| **Runtime** | AWS Lambda (Node.js) |
| **Database** | Amazon DynamoDB |
| **Test Framework** | Vitest |

## Dependencies
- **Depends On**: なし（独立して開発可能）
- **Depended By**: frontend（runtime API）, infrastructure（build artifact）

## Requirements Coverage
- FR-001: TODO 作成 → POST /api/todos + Repository.create
- FR-002: TODO 一覧表示 → GET /api/todos + Repository.findAll
- FR-003: TODO 更新 → PUT /api/todos/:id + Repository.update
- FR-004: TODO 削除 → DELETE /api/todos/:id + Repository.delete

## Security Extension Compliance (SECURITY-baseline)
- SECURITY-01: DynamoDB 暗号化（AWS デフォルト）+ SDK は TLS 使用 → N/A（インフラ側）
- SECURITY-03: Hono logger middleware で構造化ログ
- SECURITY-05: 入力バリデーション（Zod スキーマ）
- SECURITY-06: N/A（インフラ側 IAM）
- SECURITY-09: 本番エラーレスポンスにスタック情報を含めない
- SECURITY-11: Router/Handler/Repository の関心の分離
- SECURITY-15: グローバルエラーハンドラー、try/catch での例外処理

## Generation Steps

### Step 1: Workspace Root Setup（モノレポ設定）
- [x] `package.json`（root）— pnpm workspace 設定、共通 scripts
- [x] `pnpm-workspace.yaml` — packages/* 定義
- [x] `tsconfig.json`（root）— 共通 TypeScript base config（strict mode）
- [x] `biome.json` — Biome 設定（lint + format）

### Step 2: Backend Package Setup
- [x] `packages/backend/package.json` — 依存関係定義
  - dependencies: `hono`, `@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`, `ulid`, `zod`
  - devDependencies: `typescript`, `vitest`, `@hono/node-server`, `tsx`, `@types/aws-lambda`
- [x] `packages/backend/tsconfig.json` — Backend 固有の TypeScript 設定

### Step 3: Types Definition
- [x] `packages/backend/src/types/todo.ts` — Todo, CreateTodoInput, UpdateTodoInput インターフェース
- [x] `packages/backend/src/types/todo.ts` — Zod バリデーションスキーマ（CreateTodoSchema, UpdateTodoSchema）

### Step 4: Repository Layer（DynamoDB データアクセス）
- [x] `packages/backend/src/repositories/todoRepository.ts`
  - DynamoDB DocumentClient 初期化
  - `findAll()` — DynamoDB Scan
  - `findById(id)` — DynamoDB GetItem
  - `create(todo)` — DynamoDB PutItem
  - `update(id, input)` — DynamoDB UpdateItem
  - `delete(id)` — DynamoDB DeleteItem
  - エラーハンドリング（SECURITY-15）

### Step 5: Repository Layer Unit Tests
- [x] `packages/backend/src/repositories/todoRepository.test.ts`
  - DynamoDB クライアントのモック
  - 各 CRUD メソッドのテスト
  - エラーケースのテスト

### Step 6: Handler Layer（リクエスト処理）
- [x] `packages/backend/src/handlers/todoHandler.ts`
  - `list(c)` — 全件取得 → JSON レスポンス
  - `get(c)` — ID パラメータ取得 → 存在チェック → JSON レスポンス
  - `create(c)` — Zod バリデーション → ULID 生成 → 作成 → 201 レスポンス（SECURITY-05）
  - `update(c)` — Zod バリデーション → 存在チェック → 更新 → JSON レスポンス（SECURITY-05）
  - `remove(c)` — 存在チェック → 削除 → 204 レスポンス
  - エラーハンドリング（SECURITY-09, SECURITY-15）

### Step 7: Handler Layer Unit Tests
- [x] `packages/backend/src/handlers/todoHandler.test.ts`
  - Repository モック
  - 各ハンドラーの正常系テスト
  - バリデーションエラーテスト
  - 存在しない TODO のテスト

### Step 8: Router Definition
- [x] `packages/backend/src/routes/todos.ts`
  - Hono Router インスタンス
  - 5つのエンドポイント定義（GET/POST/PUT/DELETE）
  - Handler へのルーティング

### Step 9: Entry Point（Hono App + Lambda Handler）
- [x] `packages/backend/src/index.ts`
- [x] `packages/backend/src/dev.ts`（ローカル開発サーバー）
  - Hono アプリ作成
  - CORS ミドルウェア設定
  - Logger ミドルウェア設定（SECURITY-03）
  - グローバルエラーハンドラー（SECURITY-15）
  - TodoRouter 登録（`/api` プレフィックス）
  - Lambda ハンドラーエクスポート

### Step 10: Vitest Configuration
- [x] `packages/backend/vitest.config.ts` — Vitest 設定

### Step 11: Backend Code Summary Document
- [x] `aidlc-docs/construction/backend/code/code-summary.md` — 生成コードのサマリ

## Total Steps: 11
## Estimated Files: ~12 ファイル（アプリコード 7 + テスト 2 + 設定 3）+ Root 設定 4
