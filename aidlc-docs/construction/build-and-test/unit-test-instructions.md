# Unit Test Execution

## Run All Unit Tests

```bash
# プロジェクトルートから全パッケージのテスト実行
pnpm -r test
```

## Run Tests Per Package

### Backend Tests

```bash
pnpm --filter @todo-ai-dlc/backend test
```

**テスト内容**:
- `todoRepository.test.ts` — DynamoDB CRUD 操作（5 テスト）
  - findAll: 全件取得、空結果
  - findById: 正常取得、未存在
  - create: 作成と返却
  - update: 更新と返却
  - delete: 削除実行
- `todoHandler.test.ts` — API ハンドラー（11 テスト）
  - GET /api/todos: 一覧取得（正常、空）
  - GET /api/todos/:id: 個別取得（正常、404）
  - POST /api/todos: 作成（正常、description 付き、空 title、title なし、200 文字超過）
  - PUT /api/todos/:id: 更新（正常、404、バリデーションエラー）
  - DELETE /api/todos/:id: 削除（正常、404）

**Expected**: 16 tests pass, 0 failures

### Frontend Tests

```bash
pnpm --filter @todo-ai-dlc/frontend test
```

**テスト内容**:
- `TodoForm.test.tsx` — フォームコンポーネント（5 テスト）
  - 要素の描画確認
  - 空 title でのボタン無効化
  - title 入力でのボタン有効化
  - onSubmit の呼び出し
  - 送信後のフォームクリア
- `TodoItem.test.tsx` — アイテムコンポーネント（6 テスト）
  - 詳細表示
  - 完了スタイリング
  - トグル操作
  - 削除操作
  - 編集モード切り替え
  - 編集キャンセル
- `TodoList.test.tsx` — 一覧コンポーネント（3 テスト）
  - 空状態表示
  - アイテム一覧表示
  - アイテム数確認
- `App.test.tsx` — ルートコンポーネント（3 テスト）
  - タイトル表示
  - ローディング状態
  - フォーム表示

**Expected**: 17 tests pass, 0 failures

### Infrastructure Tests

```bash
pnpm --filter @todo-ai-dlc/infrastructure test
```

**テスト内容**:
- `todo-stack.test.ts` — CDK Stack assertions（7 テスト）
  - DynamoDB Table on-demand billing
  - Lambda Function 設定（Runtime, Memory, Timeout）
  - S3 Bucket block public access
  - CloudFront Distribution 存在
  - API Gateway HTTP API 存在
  - CloudFront URL Output
  - API URL Output

**Expected**: 7 tests pass, 0 failures

## Total Expected Results

| Package | Tests | Expected |
|---|---|---|
| **backend** | 16 | All pass |
| **frontend** | 17 | All pass |
| **infrastructure** | 7 | All pass |
| **Total** | **40** | **All pass** |

## Test Coverage

```bash
# カバレッジ付きで実行
pnpm --filter @todo-ai-dlc/backend vitest run --coverage
pnpm --filter @todo-ai-dlc/frontend vitest run --coverage
```

## Fix Failing Tests

1. テスト出力で失敗したテストケースを確認
2. エラーメッセージとスタックトレースを分析
3. 該当するソースコードまたはテストコードを修正
4. `pnpm -r test` で全テスト再実行
