# API Documentation

> Stage: reverse-engineering / Owner: aidlc-systems-architect-agent
> 本システムの外部コントラクトは REST のみ（イベント/キュー契約なし）。GraphQL/gRPC は不使用のため該当セクションは省略。

## System Contracts

### REST Endpoints（`/api` 配下、すべて認証なし・JSON）

ベース URL: 本番 = CloudFront 経由の同一オリジン `/api`（execute-api URL でも直接到達可能）。ローカル = Vite proxy 経由 `/api`（実体 `http://localhost:3001`）。frontend は `VITE_API_URL`（既定 `/api`）を使用。

#### TODO 一覧取得

| Field | Value |
|---|---|
| Method/Trigger | GET |
| Path/Topic/Channel | `/api/todos` |
| Purpose | 全 TODO の取得（DynamoDB Scan、順序保証なし） |
| Auth | なし |
| Input | なし（ページネーションパラメータなし） |
| Output | `200` — `Todo[]`（0 件時は `[]`） |

#### TODO 個別取得

| Field | Value |
|---|---|
| Method/Trigger | GET |
| Path/Topic/Channel | `/api/todos/:id` |
| Purpose | ID 指定で 1 件取得（UI からは未使用 — BO-O4） |
| Auth | なし |
| Input | パスパラメータ `id`（形式検証なし） |
| Output | `200` — `Todo` / `404` — `{"error": "Todo not found"}` |

#### TODO 作成

| Field | Value |
|---|---|
| Method/Trigger | POST |
| Path/Topic/Channel | `/api/todos` |
| Purpose | TODO 作成。`id`（ULID）・`completed: false`・`createdAt`/`updatedAt` をサーバーが付与 |
| Auth | なし |
| Input | `{"title": string(1-200 必須), "description"?: string(≤1000)}`（CreateTodoSchema） |
| Output | `201` — 作成された `Todo` / `400` — `{"error": "Validation failed", "details": fieldErrors}` |

#### TODO 更新

| Field | Value |
|---|---|
| Method/Trigger | PUT |
| Path/Topic/Channel | `/api/todos/:id` |
| Purpose | title / description / completed の部分更新（`updatedAt` 自動更新） |
| Auth | なし |
| Input | `{"title"?: string(1-200), "description"?: string(≤1000), "completed"?: boolean}`（UpdateTodoSchema、**全フィールド任意 = 空オブジェクトも有効**） |
| Output | `200` — 更新後 `Todo`（ALL_NEW） / `404` — not found / `400` — validation failed |

#### TODO 削除

| Field | Value |
|---|---|
| Method/Trigger | DELETE |
| Path/Topic/Channel | `/api/todos/:id` |
| Purpose | TODO の物理削除 |
| Auth | なし |
| Input | パスパラメータ `id` |
| Output | `204` — ボディなし / `404` — not found |

#### ヘルスチェック

| Field | Value |
|---|---|
| Method/Trigger | GET |
| Path/Topic/Channel | `/api/health` |
| Purpose | 稼働確認 |
| Auth | なし |
| Input | なし |
| Output | `200` — `{"status": "ok"}` |

#### 共通エラー応答

| 状況 | Status | Body |
|---|---|---|
| バリデーション失敗 | 400 | `{"error": "Validation failed", "details": {field: [messages]}}` |
| 対象なし | 404 | `{"error": "Todo not found"}` |
| 未処理例外（onError） | 500 | `{"error": "Internal server error"}`（内部情報非開示 — SECURITY-09） |

## Internal Interfaces

### todoHandler（backend）

- **Package:** `packages/backend/src/handlers/todoHandler.ts`
- **Purpose:** HTTP リクエストの検証・業務ロジック・ステータス決定

| Method | Parameters | Returns | Description |
|---|---|---|---|
| list | `c: Context` | `Response`(200) | `findAll()` 結果をそのまま JSON 返却 |
| get | `c: Context` | `Response`(200/404) | `findById` → null なら 404 |
| create | `c: Context` | `Response`(201/400) | zod 検証 → ULID + タイムスタンプ付与 → `create` |
| update | `c: Context` | `Response`(200/400/404) | `findById` 存在確認 → zod 検証 → `update` |
| remove | `c: Context` | `Response`(204/404) | `findById` 存在確認 → `delete` |

### todoRepository（backend）

- **Package:** `packages/backend/src/repositories/todoRepository.ts`
- **Purpose:** DynamoDB 永続化の隠蔽（テーブル名は `TABLE_NAME` 既定 "TodoTable"、`DYNAMODB_ENDPOINT` でローカル切替）

| Method | Parameters | Returns | Description |
|---|---|---|---|
| findAll | なし | `Promise<Todo[]>` | ScanCommand（1MB 超のページネーション未実装） |
| findById | `id: string` | `Promise<Todo \| null>` | GetCommand |
| create | `todo: Todo` | `Promise<Todo>` | PutCommand（無条件 put = 同一 id は上書き） |
| update | `id: string, input: UpdateTodoInput` | `Promise<Todo>` | UpdateExpression を動的構築、`updatedAt` 常時更新、ReturnValues: ALL_NEW |
| delete | `id: string` | `Promise<void>` | DeleteCommand（対象なしでも成功） |

### todoApi（frontend）

- **Package:** `packages/frontend/src/api/todoApi.ts`
- **Purpose:** fetch ベースの API クライアント。非 2xx は `Error(error.error)` に変換、204 は `undefined` 返却

| Method | Parameters | Returns | Description |
|---|---|---|---|
| fetchTodos | なし | `Promise<Todo[]>` | GET /todos |
| fetchTodo | `id: string` | `Promise<Todo>` | GET /todos/:id（UI 未使用） |
| createTodo | `input: CreateTodoInput` | `Promise<Todo>` | POST /todos |
| updateTodo | `id: string, input: UpdateTodoInput` | `Promise<Todo>` | PUT /todos/:id |
| deleteTodo | `id: string` | `Promise<void>` | DELETE /todos/:id |

## Data Models

### Todo

- **Location:** `packages/backend/src/types/todo.ts` および `packages/frontend/src/types/todo.ts`（同一定義の重複 — CS-O1）
- **Fields:**

| Field | Type | Constraints | Description |
|---|---|---|---|
| id | string | ULID（26 字、サーバー生成） | 一意識別子。DynamoDB PK |
| title | string | 必須、1〜200 文字（zod） | タイトル |
| description | string? | 任意、≤1000 文字（zod） | 詳細説明 |
| completed | boolean | 必須。作成時 false 固定 | 完了状態 |
| createdAt | string | ISO 8601（サーバー生成） | 作成日時 |
| updatedAt | string | ISO 8601（サーバー更新） | 更新日時 |

- **Relationships:** なし（単一エンティティ。リレーションなし）
- **Validation rules:** CreateTodoSchema（title 必須）/ UpdateTodoSchema（全任意）。検証は backend のみが強制し、frontend の maxLength は UX 目的（v1 設計どおりサーバーが主防衛線）

### DynamoDB テーブル: TodoTable

| Attribute | Type | Key |
|---|---|---|
| id | S | Partition Key |

- その他属性はスキーマレスに Todo のフィールドをそのまま格納。GSI/LSI なし、TTL なし、オンデマンド課金、PITR 有効。

---

## Observations（観測事項 — 事実の記録）

| # | 観測事項 | 根拠 |
|---|---|---|
| API-O1 | `PUT /api/todos/:id` は意味論的には**部分更新（PATCH 相当）**。空オブジェクト `{}` も有効入力で、その場合 `updatedAt` のみ更新される | `UpdateTodoSchema`（全フィールド optional）、`todoRepository.update:69-71` |
| API-O2 | 更新/削除の存在確認（findById）と書込が別リクエストで**非アトミック**（確認後に消えた id への update は item を新規作成し得る: UpdateCommand は upsert 動作） | `todoHandler.ts:46-75`、DynamoDB UpdateItem 仕様 |
| API-O3 | `findAll` の Scan は 1MB/ページの制限に対する**ページネーション未実装**（LastEvaluatedKey 無視）。件数増で一覧が欠落する。API にも limit/cursor パラメータなし | `todoRepository.findAll:22-25` |
| API-O4 | `create` は無条件 PutCommand のため、同一 id の再送で**上書き**される（ULID 生成がサーバー側なので実際の衝突確率は無視できる水準） | `todoRepository.create:37-45` |
| API-O5 | パスパラメータ `id` の形式検証なし（任意文字列をそのまま Key に使用）。DynamoDB Key 直渡しのためインジェクションリスクはないが、無効 ID も 404 まで到達する | `todoHandler.ts:14, 47, 67` |
| API-O6 | 400 応答の `details` に zod の fieldErrors をそのまま含める（内部実装情報ではなく入力検証メッセージのみであり、SECURITY-09 とは矛盾しない） | `todoHandler.ts:26-29` |
| API-O7 | API コントラクトの機械可読定義（OpenAPI 等）が存在しない。frontend/backend 間の整合はコンベンション頼み（型重複 CS-O1 と同根） | リポジトリ全体 |
| API-O8 | `create`/`update` で `c.req.json()` が try/catch 外にあり、**不正 JSON ボディは onError の 500** になる（クライアント起因エラーとしては 400 が適切） | `todoHandler.ts:23, 53`、`index.ts:14-17` |
| API-O9 | frontend のミューテーション（create/toggle/update/delete）は **App.tsx 側に catch がなく**、API 失敗時にユーザーへのエラー表示がない（一覧ロードのみ error state あり）。TodoForm は try/finally のみで例外は未処理 rejection になる | `App.tsx:29-49`、`TodoForm.tsx:17-27` |

## Refactoring Proposals（リファクタリング提案 — 下流ステージの判断材料）

| # | 提案 | 対応する観測 | トレードオフ |
|---|---|---|---|
| API-P1 | 更新/削除を `ConditionExpression: attribute_exists(id)` による条件付き書込へ変更（404 は ConditionalCheckFailedException で判定）。findById 往復が消えアトミックになる（AR-P7 と同一） | API-O2 | DynamoDB 呼出が半減。例外ハンドリングのコードはやや増える |
| API-P2 | `findAll` に LastEvaluatedKey ループまたは limit/cursor パラメータを実装。あわせて表示順序（BO-P4）を API 仕様として明記 | API-O3 | デモ規模では実害なしのため、要件化の要否を requirements-analysis で判断 |
| API-P3 | 部分更新の意味論を明示: PATCH メソッドへ変更（または PUT のまま「部分更新」と仕様文書化）。空オブジェクト拒否（`.refine` で最低 1 フィールド要求）も検討 | API-O1 | メソッド変更は frontend・テストへ波及。文書化のみなら低コスト |
| API-P4 | `c.req.json()` を検証フローに取り込み、不正 JSON を 400 で返す（Hono の `validator`/`@hono/zod-validator` 導入で API-O6 含め検証系を一元化可能） | API-O8 | zod-validator 導入は依存追加だが handler が大幅に簡素化 |
| API-P5 | frontend のミューテーション失敗時のエラーハンドリング（catch + ユーザー通知）を App.tsx に追加 | API-O9 | 小改修。UX 改善と未処理 rejection の解消 |
| API-P6 | OpenAPI 定義の導入（`@hono/zod-openapi` で schema から生成）し、コントラクトを単一ソース化。CS-P1（共有パッケージ）と組み合わせると型・検証・API 文書が一貫する | API-O7 | 依存とビルド手順が増える。教材価値は高い |
