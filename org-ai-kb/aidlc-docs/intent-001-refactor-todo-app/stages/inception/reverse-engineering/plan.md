# Reverse Engineering — Plan

> Stage: reverse-engineering / Owner: aidlc-systems-architect-agent
> Intent: refactor-todo-app（brownfield-refactoring）
> 解析対象: `/Users/seike460/src/github.com/fusic/todo-ai-dlc` の `packages/` 配下

## 解析対象の概況（下見結果）

- pnpm monorepo（pnpm@9.15.0、Biome 1.9.4、TypeScript 5.7、vitest 2.1）
- `packages/backend` — Hono 4.6 / Lambda handler（`hono/aws-lambda`）。routes → handlers → repositories の層構造。zod 検証、ulid ID、DynamoDB（lib-dynamodb）。CRUD 5 エンドポイント + health check
- `packages/frontend` — React 19 + Vite 6 + Tailwind 4。App / TodoForm / TodoItem / TodoList コンポーネントと fetch ベースの `todoApi`
- `packages/infrastructure` — AWS CDK 2.177（単一 `TodoStack`）: DynamoDB / NodejsFunction / API Gateway HTTP API / S3 + CloudFront（OAC・セキュリティヘッダ）/ BucketDeployment
- ルートにローカル開発環境（docker-compose: dynamodb-local + backend + frontend、Dockerfile.dev）— ビルド/開発ツールとして解析範囲に含める
- `org-ai-kb/` は intent 成果物、`aidlc-docs/` は v1 設計成果物 — 解析対象外（文脈参照のみ。Q3 の回答に従う）

## Artifact Resolution（入力の解決）

- **Required: ソースコード** — workspace 内に存在。直接読込で解析する
- **Optional: intent.md** — 読込済み（brownfield-refactoring、対象は `packages/` 配下）
- **Optional: 過去の RE 成果物** — 存在しない（本ステージが本 intent の最初のステージ）。v1 の `aidlc-docs/` は RE 成果物ではなく設計成果物のため、Q3 の回答に応じて文脈参照として扱う
- 上流ステージのスキップによる推測補完は不要（RE はワークフロー先頭のため）

## 生成予定成果物（Q1 の回答により確定）

推奨構成（Q1 = b）の場合、本ステージディレクトリに以下を生成する:

| 成果物 | 内容 |
|---|---|
| `business-overview.md` | 業務文脈図、業務トランザクション（BT-n）、Business Dictionary、パッケージ別業務記述 |
| `architecture.md` | システム概要、アーキテクチャ図（mermaid）、コンポーネント記述、データフロー、統合ポイント、インフラ構成 |
| `code-structure.md` | ビルドシステム（pnpm/Biome/docker-compose）、モジュール階層、ファイルインベントリ、設計パターン、重要依存 |
| `api-documentation.md` | REST コントラクト（/api/todos CRUD + /api/health）、内部インターフェース（handler/repository/api client）、データモデル（Todo / Create / Update + zod 制約） |
| `technology-stack.md` | 言語・フレームワーク・AWS サービス・ビルド/テストツール・観測性 |
| `dependencies.md` | パッケージ間依存図、外部依存カタログ（runtime/dev）、依存リスク |

- `component-inventory.md` は省略（3 パッケージの一覧が architecture.md と完全重複するため）。省略理由は architecture.md に明記する
- **回答確定（2026-06-09）**: Q1 = b（6 成果物）/ Q2 = **c**（観測事項に加えリファクタリング提案も記述）/ Q3 = c（軽量ドリフト確認込み）
- Q2 = c に従い、各成果物に「Observations（観測事項）」と「Refactoring Proposals（リファクタリング提案）」の両セクションを設け、事実と提案を明確に区別して記録する。Q3 = c に従い、v1 設計とコードの乖離は Observations に **［v1 ドリフト］** として記録する

## 作業手順

- [x] 1. 質問への回答を確認し、成果物セットと解析方針を確定する（Q1–Q3）
- [x] 2. 詳細解析: backend 全ソース精読（routes/handlers/repositories/types/dev、テスト含む）
- [x] 3. 詳細解析: frontend 全ソース精読（App/components/api/types、vite.config のプロキシ設定、テスト含む）
- [x] 4. 詳細解析: infrastructure 精読（bin/app.ts、lib/todo-stack.ts、cdk.json、テスト）
- [x] 5. 詳細解析: ルートのビルド/開発環境（package.json、pnpm-workspace、biome.json、tsconfig、docker-compose、Dockerfile.dev、README）
- [x] 6. （Q3 = b/c の場合）v1 成果物から用語・要件 ID（SECURITY-xx 等）の文脈を補完する
- [x] 7. `business-overview.md` を生成（業務トランザクションに BT-n の安定 ID を付与）
- [x] 8. `architecture.md` を生成（component-inventory 省略の理由を記載）
- [x] 9. `code-structure.md` を生成
- [x] 10. `api-documentation.md` を生成
- [x] 11. `technology-stack.md` を生成
- [x] 12. `dependencies.md` を生成
- [x] 13. 成果物間の整合チェック（コンポーネント名・BT-n 参照・依存関係の相互一致、テンプレート準拠）
- [x] 14. `state/state.json` の outputs に全成果物を登録し、status を `artifact-generated` に更新する
