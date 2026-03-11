# Units of Work

## Unit Decomposition Strategy

**Decomposition Approach**: 技術レイヤー別分解（Frontend / Backend / Infrastructure）
**Deployment Model**: Serverless（Lambda + S3 + CloudFront）
**Project Structure**: pnpm monorepo（packages/）

## Units

### Unit 1: backend

| Property | Value |
|---|---|
| **Name** | backend |
| **Type** | Service (Lambda Function) |
| **Package Path** | `packages/backend/` |
| **Description** | Hono REST API for TODO CRUD operations |
| **Runtime** | Node.js (Lambda) |
| **Framework** | Hono |

**Responsibilities**:
- REST API エンドポイント（5つ）の提供
- リクエストバリデーション
- DynamoDB との CRUD 操作
- CORS・ログミドルウェア

**Components**:
- TodoRouter（ルーティング）
- TodoHandler（ハンドラー）
- TodoRepository（データアクセス）

**Key Files**:
- `src/index.ts` - Hono app + Lambda handler
- `src/routes/todos.ts` - ルート定義
- `src/handlers/todoHandler.ts` - ハンドラー
- `src/repositories/todoRepository.ts` - DynamoDB 操作

---

### Unit 2: frontend

| Property | Value |
|---|---|
| **Name** | frontend |
| **Type** | Module (Static SPA) |
| **Package Path** | `packages/frontend/` |
| **Description** | React SPA for TODO management |
| **Runtime** | Browser |
| **Framework** | React + Vite |

**Responsibilities**:
- TODO CRUD の UI 提供
- ユーザーインタラクションの処理
- Backend API との HTTP 通信
- 状態管理（useState）

**Components**:
- TodoApp（ルート）
- TodoList（一覧）
- TodoItem（個別アイテム）
- TodoForm（作成・編集フォーム）
- TodoAPI（API 通信）

**Key Files**:
- `src/App.tsx` - ルートコンポーネント
- `src/components/TodoList.tsx`
- `src/components/TodoItem.tsx`
- `src/components/TodoForm.tsx`
- `src/api/todoApi.ts` - API クライアント

---

### Unit 3: infrastructure

| Property | Value |
|---|---|
| **Name** | infrastructure |
| **Type** | Infrastructure (CDK) |
| **Package Path** | `packages/infrastructure/` |
| **Description** | AWS CDK stack for all resources |
| **Runtime** | CDK CLI |
| **Framework** | AWS CDK (TypeScript) |

**Responsibilities**:
- DynamoDB テーブルの定義
- Lambda 関数の定義
- API Gateway（HTTP API）の定義
- S3 + CloudFront の定義
- IAM ロール・ポリシーの定義

**Components**:
- TodoStack（メインスタック）

**Key Files**:
- `bin/app.ts` - CDK アプリエントリーポイント
- `lib/todo-stack.ts` - メインスタック定義

## Code Organization (Greenfield)

```
packages/
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   └── src/
│       ├── index.ts
│       ├── routes/
│       ├── handlers/
│       ├── repositories/
│       └── types/
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── components/
│       ├── api/
│       ├── types/
│       └── index.css
└── infrastructure/
    ├── package.json
    ├── tsconfig.json
    ├── cdk.json
    ├── bin/
    │   └── app.ts
    └── lib/
        └── todo-stack.ts
```

## Construction Phase Strategy

| Unit | Construction Order | Rationale |
|---|---|---|
| **backend** | 1st | API 仕様を先に確定。型定義が frontend で再利用可能 |
| **frontend** | 2nd | backend API が確定後に実装。API 型に合わせた開発 |
| **infrastructure** | 3rd | backend/frontend のビルド成果物が必要。デプロイ設定 |
