# Application Design - Consolidated

> **Note**: 本ドキュメントは v1（初期構築時）の記録です。最新の設計の正は `org-ai-kb/aidlc-docs/intent-001-refactor-todo-app/` 配下を参照してください。

## Project Structure

```
todo-ai-dlc/
├── package.json              # Root (pnpm workspace)
├── pnpm-workspace.yaml
├── biome.json                # 共通 Biome 設定
├── tsconfig.json             # 共通 TypeScript 設定
├── packages/
│   ├── frontend/             # React + Vite SPA
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx
│   │       ├── components/
│   │       │   ├── TodoList.tsx
│   │       │   ├── TodoItem.tsx
│   │       │   └── TodoForm.tsx
│   │       ├── api/
│   │       │   └── todoApi.ts
│   │       ├── types/
│   │       │   └── todo.ts
│   │       └── index.css
│   ├── backend/              # Hono REST API
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts       # Hono app entry + Lambda handler
│   │       ├── routes/
│   │       │   └── todos.ts   # TodoRouter
│   │       ├── handlers/
│   │       │   └── todoHandler.ts
│   │       ├── repositories/
│   │       │   └── todoRepository.ts
│   │       └── types/
│   │           └── todo.ts
│   └── infrastructure/       # AWS CDK
│       ├── package.json
│       ├── tsconfig.json
│       ├── cdk.json
│       ├── bin/
│       │   └── app.ts
│       └── lib/
│           └── todo-stack.ts
└── aidlc-docs/               # AI-DLC Documentation
```

## Architecture

```
+------------------+     +-------------------+     +------------------+
|                  |     |                   |     |                  |
|   React + Vite   |---->|  API Gateway      |---->|  Lambda (Hono)   |
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

## Components Summary

9つのコンポーネントで構成：

**Frontend (5)**:
- `TodoApp` - ルートコンポーネント、state 管理
- `TodoList` - 一覧表示
- `TodoItem` - 個別アイテム表示・操作
- `TodoForm` - 作成専用フォーム（編集は `TodoItem` のインライン編集 UI が担う — RF-22① 現状一致）
- `TodoAPI` - Backend API 通信レイヤー

**Backend (3)**:
- `TodoRouter` - REST API ルーティング（Hono）
- `TodoHandler` - リクエスト処理・バリデーション
- `TodoRepository` - DynamoDB データアクセス

**Infrastructure (1)**:
- `TodoStack` - AWS CDK スタック

## Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| プロジェクト構成 | pnpm monorepo | packages 間の型共有、統一的なビルド |
| 状態管理 | React useState | 基本 CRUD にはシンプルで十分 |
| API 通信 | fetch API | 追加依存なし、モダンブラウザ標準 |
| ID 生成 | ULID | ソート可能な一意 ID |
| DynamoDB SDK | v3 DocumentClient | esbuild バンドルでは `externalModules: ["@aws-sdk/*"]` で除外し、Lambda ランタイム同梱の SDK に依存する（バンドルには含めない — RF-22③ 現状一致） |
| Backend Framework | Hono | 軽量、Web Standards API ベース |
| CDK Construct Level | L2 Constructs | 適度な抽象化、ベストプラクティス適用 |

## API Endpoints

| Method | Path | Handler | Description |
|---|---|---|---|
| `POST` | `/api/todos` | `create` | TODO 作成 |
| `GET` | `/api/todos` | `list` | TODO 一覧取得 |
| `GET` | `/api/todos/:id` | `get` | TODO 個別取得 |
| `PUT` | `/api/todos/:id` | `update` | TODO 更新（部分更新意味論 — 送信したフィールドのみ更新。正式仕様は v2 `api-specification.md` API-004 — RF-22②） |
| `DELETE` | `/api/todos/:id` | `remove` | TODO 削除 |

## Shared Types

```typescript
interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreateTodoInput {
  title: string;
  description?: string;
}

interface UpdateTodoInput {
  title?: string;
  description?: string;
  completed?: boolean;
}
```

## Related Documents
- [Components](./components.md)
- [Component Methods](./component-methods.md)
- [Services](./services.md)
- [Component Dependencies](./component-dependency.md)
