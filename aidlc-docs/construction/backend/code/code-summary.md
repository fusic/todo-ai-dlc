# Backend Code Generation Summary

## Generated Files

### Application Code (`packages/backend/`)

| File | Purpose |
|---|---|
| `src/index.ts` | Hono アプリ作成、ミドルウェア、Lambda ハンドラーエクスポート |
| `src/dev.ts` | ローカル開発サーバー（@hono/node-server） |
| `src/types/todo.ts` | Todo インターフェース + Zod バリデーションスキーマ |
| `src/repositories/todoRepository.ts` | DynamoDB CRUD 操作（DocumentClient v3） |
| `src/handlers/todoHandler.ts` | リクエスト処理、バリデーション、レスポンス生成 |
| `src/routes/todos.ts` | Hono Router — 5 エンドポイント定義 |

### Tests (`packages/backend/`)

| File | Coverage |
|---|---|
| `src/repositories/todoRepository.test.ts` | findAll, findById, create, update, delete + エラーケース |
| `src/handlers/todoHandler.test.ts` | 全 5 エンドポイントの正常系 + バリデーションエラー + 404 |

### Configuration

| File | Purpose |
|---|---|
| `package.json` | 依存関係、scripts（dev, test, typecheck） |
| `tsconfig.json` | TypeScript strict mode 設定 |
| `vitest.config.ts` | Vitest テスト設定 |

### Workspace Root（共通設定）

| File | Purpose |
|---|---|
| `package.json` | pnpm workspace root、共通 scripts |
| `pnpm-workspace.yaml` | packages/* 定義 |
| `tsconfig.json` | 共通 TypeScript base config |
| `biome.json` | Biome lint + format 設定 |

## API Endpoints

| Method | Path | Handler | Status Codes |
|---|---|---|---|
| `GET` | `/api/todos` | `list` | 200 |
| `GET` | `/api/todos/:id` | `get` | 200, 404 |
| `POST` | `/api/todos` | `create` | 201, 400 |
| `PUT` | `/api/todos/:id` | `update` | 200, 400, 404 |
| `DELETE` | `/api/todos/:id` | `remove` | 204, 404 |
| `GET` | `/api/health` | inline | 200 |

## Architecture Layers

```
Hono App (index.ts)
  |-- CORS middleware
  |-- Logger middleware (SECURITY-03)
  |-- Global error handler (SECURITY-15)
  |-- TodoRouter (routes/todos.ts)
        |-- TodoHandler (handlers/todoHandler.ts)
              |-- Zod validation (SECURITY-05)
              |-- TodoRepository (repositories/todoRepository.ts)
                    |-- DynamoDB DocumentClient v3
```

## Security Compliance

| Rule | Status | Notes |
|---|---|---|
| SECURITY-03 | Compliant | Hono logger middleware |
| SECURITY-05 | Compliant | Zod スキーマバリデーション（title max 200, description max 1000） |
| SECURITY-09 | Compliant | エラーレスポンスに内部情報を含めない |
| SECURITY-11 | Compliant | Router/Handler/Repository の関心分離 |
| SECURITY-15 | Compliant | グローバルエラーハンドラー + try/catch パターン |

## Dependencies

### Production
- `hono` — Web フレームワーク（Lambda 対応）
- `@aws-sdk/client-dynamodb` + `@aws-sdk/lib-dynamodb` — DynamoDB アクセス
- `ulid` — ソート可能な一意 ID 生成
- `zod` — 入力バリデーション

### Development
- `typescript` — 型チェック
- `vitest` — テストランナー
- `@hono/node-server` — ローカル開発サーバー
- `tsx` — TypeScript 実行
- `@types/aws-lambda` — Lambda 型定義
