# Frontend Code Generation Plan

## Unit Context

| Property | Value |
|---|---|
| **Unit** | frontend |
| **Package Path** | `packages/frontend/` |
| **Framework** | React 19 + Vite |
| **UI Styling** | Tailwind CSS v4 |
| **State Management** | React useState |
| **API Communication** | fetch API |
| **Test Framework** | Vitest |

## Dependencies
- **Depends On**: backend（runtime REST API）
- **Depended By**: infrastructure（build artifact for S3）

## Requirements Coverage
- FR-001: TODO 作成 → TodoForm + TodoApp.handleCreate + TodoAPI.createTodo
- FR-002: TODO 一覧表示 → TodoList + TodoApp (useEffect) + TodoAPI.fetchTodos
- FR-003: TODO 更新 → TodoItem (edit/toggle) + TodoApp.handleUpdate + TodoAPI.updateTodo
- FR-004: TODO 削除 → TodoItem (delete) + TodoApp.handleDelete + TodoAPI.deleteTodo

## Security Extension Compliance (SECURITY-baseline)
- SECURITY-04: N/A（CloudFront/API Gateway レベルでヘッダー設定。SPA 側は CSP meta タグ検討）
- SECURITY-05: フロントエンドバリデーション（UX 目的、サーバー側が主防衛線）
- SECURITY-09: ユーザー向けエラーメッセージに内部詳細を含めない
- SECURITY-13: N/A（外部 CDN スクリプトなし、npm パッケージのみ）

## Generation Steps

### Step 1: Frontend Package Setup
- [x] `packages/frontend/package.json` — 依存関係定義
  - dependencies: `react`, `react-dom`
  - devDependencies: `typescript`, `vite`, `@vitejs/plugin-react`, `tailwindcss`, `@tailwindcss/vite`, `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `@types/react`, `@types/react-dom`
- [x] `packages/frontend/tsconfig.json` — Frontend TypeScript 設定
- [x] `packages/frontend/vite.config.ts` — Vite 設定（React plugin + Tailwind + proxy）
- [x] `packages/frontend/index.html` — SPA エントリー HTML

### Step 2: Types + API Client
- [x] `packages/frontend/src/types/todo.ts` — Todo, CreateTodoInput, UpdateTodoInput 型定義
- [x] `packages/frontend/src/api/todoApi.ts` — Backend REST API 通信クライアント（fetch ベース）

### Step 3: TodoForm Component
- [x] `packages/frontend/src/components/TodoForm.tsx` — 作成フォーム
  - title 入力（必須、data-testid 付き）
  - description 入力（任意、data-testid 付き）
  - 送信ボタン（data-testid 付き）
  - クライアントサイドバリデーション

### Step 4: TodoItem Component
- [x] `packages/frontend/src/components/TodoItem.tsx` — 個別 TODO 表示・操作
  - 完了トグルチェックボックス（data-testid 付き）
  - タイトル・説明表示
  - 編集モード切り替え
  - 削除ボタン（data-testid 付き）

### Step 5: TodoList Component
- [x] `packages/frontend/src/components/TodoList.tsx` — TODO 一覧表示
  - TODO 配列のレンダリング
  - 空状態メッセージ

### Step 6: App Component（Root）
- [x] `packages/frontend/src/App.tsx` — ルートコンポーネント
  - useState で TODO 一覧管理
  - useEffect で初回ロード
  - handleCreate, handleUpdate, handleDelete, handleToggle
  - TodoForm + TodoList の配置
  - ローディング状態・エラー状態

### Step 7: Entry Point + Styling
- [x] `packages/frontend/src/main.tsx` — React DOM レンダリング
- [x] `packages/frontend/src/index.css` — Tailwind CSS インポート

### Step 8: Component Tests
- [x] `packages/frontend/src/components/TodoForm.test.tsx`
- [x] `packages/frontend/src/components/TodoItem.test.tsx`
- [x] `packages/frontend/src/components/TodoList.test.tsx`
- [x] `packages/frontend/src/App.test.tsx`

### Step 9: Vitest Configuration
- [x] `packages/frontend/vitest.config.ts` — Vitest + jsdom 設定
- [x] `packages/frontend/src/test/setup.ts` — テストセットアップ

### Step 10: Frontend Code Summary Document
- [x] `aidlc-docs/construction/frontend/code/code-summary.md` — 生成コードのサマリ

## Total Steps: 10
## Estimated Files: ~16 ファイル（アプリコード 9 + テスト 4 + 設定 3）
