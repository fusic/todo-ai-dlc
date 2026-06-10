# Plan — code-generation / unit: todo-app (UNIT-001)

> Stage: code-generation / Owner: aidlc-sw-dev-engineer-agent / 2026-06-10
> リズム: **write → test → verify** — 各ステップは「動くコード + green の検証」で閉じる（一括ダンプしない）。
> フェーズ構成: unit-story-map.md の **P0（検証ゲート）→ P1（実装品質）→ P2（基盤）**。BT-1〜7 の振る舞い保持（BP-1）は全フェーズ横断の不変条件 — 既存 45 テスト（backend 21 / frontend 17 / infrastructure 7）は常に green を維持する。
> 検証コマンド: `pnpm lint` / `pnpm test` / `pnpm build`（+ ステップに応じて `pnpm -r typecheck`・`pnpm --filter @todo-ai-dlc/infrastructure synth`・Playwright）。
> 制約: 実装コードはワークスペースルート `packages/` 等に置く（aidlc-docs には置かない）。git 操作（commit / branch）は行わない（orchestrator が人間確認のうえ実施）。上流決定（Q1〜Q5 / D-1〜D-7 / QT-1〜9 / CH-1〜10 / IT-1〜10）の再決定はしない — 翻訳と実装のみ。

## Artifact Resolution（使用した上流成果物と fallback の記録）

| 関心 | 使用成果物（richest available） | 備考 |
|---|---|---|
| 機能仕様 | functional-design: `entities.yaml` / `rules.yaml`（BR-001〜014） / `api-specification.md`（API-001〜006 + 共通エラー + versioning） / `functional-spec.md`（WF / SM-001） | 必須入力 — すべて存在 |
| copy-forward 元 | **infrastructure-design 版** `components.yaml` / `unit.md`（最も詳細な版） | 本 stage directory へコピーし実装参照を追記する |
| NFR | nfr-design: `nfr-specification.md`（QT-1〜9 / D-1〜D-7 / C-1〜C-9 / Tech Stack） | Powertools / Playwright / audit high / アラームパラメータの正 |
| インフラ | infrastructure-design: `infrastructure-specification.md`（CH-1〜CH-10 / IT-1〜IT-10 / construct 設計 / ヘッダ名・環境変数名） | CDK 変更とテストの正 |
| ストーリー | units-generation → functional-design 版 `unit-story-map.md`（29 行 + フェーズ列） | story-generation は未実施 — BT-1〜7 を story 相当とする fallback（上流確立済み） |
| 既存パターン | RE `code-structure.md` + 実コード `packages/`（routes → handlers → repositories、`app.request` テスト、data-testid 等） | brownfield — 既存規約に従う |
| contract-design | 不在（単一 unit — スキップは設計どおり） | API コントラクトは api-specification.md が正。追加推論なし |
| wireframe-design | 不在 | UI 変更（RF-08 createdAt 表示・RF-05 エラー表示）は WF-002 / BR-011 の記述から最小実装で推論（既存 UX を変えない） |

## 設問の反映点

- Q1（E2E 配置）→ Step 3 / CI ジョブ定義
- Q2（RF-18 範囲）→ Step 13
- Q3（フェーズ境界の停止）→ 本プラン全体の実行単位
- Q4（v1 文書範囲）→ Step 17

## Steps

### Step 0: ベースライン確認（着手前の green 証跡）

- [x] 0-1. `pnpm install` / `pnpm lint` / `pnpm test` / `pnpm build` を実行し、既存 45 テスト green・build 成功を記録する（BP-1 の基準線）
  - 実測（2026-06-10 着手時）: orchestrator 実測どおり 38/45 pass・lint red（54 errors）・frontend build red（TS2339）。`pnpm -r typecheck` も backend（process / param 型）・frontend（import.meta.env）・infrastructure（@types/node / OutputFormat）で red
  - ベースライン修復（RF-01 の前提作業として実施 — 振る舞い変更なし）:
    - biome.json に files.ignore 追加（dist / cdk.out / coverage / test-results / playwright-report / org-ai-kb / aidlc-docs）+ `biome check --write`（import 順・整形のみ）
    - frontend tsconfig に `vite/client`、backend/infrastructure に `@types/node` 追加
    - **バグ修正**: `todo-stack.ts` の `lambda.OutputFormat.ESM` → `OutputFormat`（`aws-cdk-lib/aws-lambda-nodejs` から import）。`OutputFormat` は aws-lambda には存在せず、vitest ロードエラー `Cannot read properties of undefined (reading 'ESM')` の根本原因
    - infrastructure に `esbuild` devDependency 追加（NodejsFunction のローカルバンドル — テスト/synth が Docker 不要で完結）
    - todoHandler の `:id` 系 3 メソッドを `Context<Env, "/:id">` で型付け（param の string | undefined 解消）
  - 修復後: 45/45 テスト pass・lint / typecheck / build / synth すべて green を確認（真の基準線確立）

### P0 — 検証ゲートとコントラクト一元化（RF-03 → RF-01 → RF-02）

> RF-03 を先行する理由: CI（RF-01）の typecheck/test 対象に shared を最初から含めるため（QT-7 の「全 4 パッケージ」を一度で確立）。

- [x] 1. **CMP-003 `@todo-ai-dlc/shared` 新設（RF-03 / BR-014 / ENT-001）**
  - [x] 1-1. `packages/shared` 作成 — ビルドなし・ソース直接参照（functional-design Q5=a）。公開面を分離: 型 + 制約定数（`TITLE_MAX_LENGTH = 200` / `DESCRIPTION_MAX_LENGTH = 1000`）= CMP-001/002 共用（exports `.`）、zod schema（`CreateTodoSchema` / `UpdateTodoSchema`）= CMP-002 専用エントリ（exports `./schemas`）（Q4=a / BR-014）
  - [x] 1-2. shared の unit テスト 16 件（schema 境界値 1/200/201/1000/1001・空オブジェクト BR-006 — テスト側リテラルは直書き維持: Q3=a）+ 型レベルアサーション（z.infer と公開型の整合 — ドリフトは typecheck で fail）
  - [x] 1-3. backend / frontend の重複定義（`src/types/todo.ts` ×2 を削除、TodoForm / TodoItem の maxLength リテラル 200/1000 を共有定数参照へ）を shared 参照へ置換し `workspace:` 依存を追加。backend の直接 zod 依存は shared へ移管。プロダクションコード内の制約リテラルは shared/src/constants.ts の 1 箇所のみを確認（grep 証跡）
    - 波及対応: Dockerfile.dev に shared の package.json COPY、docker-compose.yml の backend/frontend に shared src マウント + shared node_modules ボリューム追加（A-7 環境維持）
  - [x] 1-4. 検証: `pnpm lint` / `pnpm test`（61 = 既存 45 + shared 16 全 green）/ `pnpm -r typecheck` / `pnpm build` すべて green
- [x] 2. **CI 検証ゲート（RF-01 / QT-7 / D-3）**
  - [x] 2-1. root に `typecheck` スクリプト追加（`pnpm -r typecheck` — shared 含む全 4 workspace）
  - [x] 2-2. `.github/workflows/ci.yml` — 6 ジョブ: lint / typecheck / test / synth（**frontend build を先行ステップに配置** — DEP-O2 必須引き継ぎ）/ audit（`pnpm audit --audit-level=high`）/ e2e
    - audit ゲート green 化: レンジ内更新（@aws-sdk ^3.1065 → fast-xml-parser 5.7.3 / vite ^6.4.3 / picomatch 4.0.4）+ vitest GHSA-5xrq-8626-4rwp のみ `auditConfig.ignoreGhsas` で理由コメント付き ignore（C-6。`vitest --ui` 不使用のため悪用経路なし。RF-18 の Vitest 3 で解消し次第削除 — package.json と pnpm-workspace.yaml の両方に記載: pnpm v9/v10 互換）
  - [x] 2-3. README にブランチ保護の運用 1 節（required checks 6 ジョブ指定 + PR 必須）+ E2E 実行手順
  - [x] 2-4. 検証: 各ジョブ相当コマンドをローカル実行し全 green — lint=0 / typecheck=0 / test=0（61 件）/ frontend build + synth=0 / audit=0（CI 実体の green は push 後に orchestrator が確認）
- [x] 3. **E2E スモーク（RF-02 / D-7 / BP-1 検証装置）**
  - [x] 3-1. Playwright 導入（Q1=a: ルート直下 `e2e/` + ルート devDependencies `@playwright/test`。playwright.config.ts はルート、baseURL=http://localhost:3000、trace: retain-on-failure）。`e2e/todo-smoke.spec.ts` — BT-1〜5 の 1 周（作成 → 一覧 → 編集 → トグル → 削除）+ BT-7（`/api/health` 200 + `{status:"ok"}` アサーション）。既存 data-testid を locator に使用
  - [x] 3-2. CI の e2e ジョブを有効化（compose 起動 + readiness 待ち = セットアップステップ、テスト実行を別ステップに分離。失敗時 playwright-report を artifact upload）
  - [x] 3-3. 検証: ローカルで docker-compose 起動 → E2E 2/2 green（chromium、実ブラウザ + DynamoDB Local）
- [x] （Q3=a の場合）**P0 完了報告 — 停止**（orchestrator レビュー / コミット後に P1 へ）

#### P0 完了記録（2026-06-10）

- 検証証跡（最終）: `pnpm lint` green（biome 44 files）/ `pnpm test` green **61 件**（shared 16 / backend 21 / frontend 17 / infrastructure 7 — ベースライン 45 + 新規 16）/ `pnpm typecheck` green（4 パッケージ）/ `pnpm build` green / `pnpm --filter @todo-ai-dlc/infrastructure synth` green / `pnpm audit --audit-level=high` green / `pnpm test:e2e` 2/2 green
- 新規ファイル: `packages/shared/`（package.json / tsconfig.json / vitest.config.ts / src/{constants,types,schemas,index}.ts / src/schemas.test.ts）、`.github/workflows/ci.yml`、`playwright.config.ts`、`e2e/todo-smoke.spec.ts`
- 変更ファイル: biome.json（ignore）、package.json（typecheck・test:e2e スクリプト / @playwright/test / auditConfig）、pnpm-workspace.yaml（auditConfig）、pnpm-lock.yaml、README.md（CI/ブランチ保護/E2E 節・構成図）、Dockerfile.dev、docker-compose.yml、backend（package.json / tsconfig / vitest.config / handlers / repositories / index — import 先変更と型付け）、frontend（package.json / tsconfig / api / App / components / tests — import 先変更と定数参照）、infrastructure（package.json / tsconfig 経由なし / lib/todo-stack.ts の OutputFormat 修正）
- 残課題（orchestrator / 人間へ）: ① CI 実体（GitHub Actions）の green 確認は push 後 ② ブランチ保護の有効化は手動（README 記載） ③ vitest の ignoreGhsas は P2 RF-18（Vitest 3）で削除

### P1 — backend / frontend 実装品質（RF-04〜13）

- [ ] 4. **CMP-002: zod 強制 + 不正 JSON 400（RF-04 / BR-008 / BR-009）** — handler の評価順序を「ボディ解釈 → 入力検証 → 書込」に固定。JSON 解釈不能は 400。テスト: 不正 JSON 400 / 有効入力の応答不変
- [ ] 5. **CMP-002: 条件付き書込（RF-07 / BR-007 / QT-9）** — repository の update / delete を `ConditionExpression: attribute_exists(id)` の単一呼出に変更（DynamoDB 呼出 各 1 回）。404 は条件失敗例外で判定。テスト: 不存在 id の PUT が新規作成せず 404 / 複合ケース（不正ボディ × 不存在 id）は 400 優先（BR-009）/ 呼出回数 1 回
- [ ] 6. **CMP-002: 一覧順序保証（RF-06 / BR-010）** — API-002 応答生成時に createdAt 降順・tie は id 降順でソート。テスト: 順序 + tie-break の決定性
- [ ] 7. **CMP-002: 構造化ログ（RF-10/11 / QT-6 / D-6）** — `@aws-lambda-powertools/logger` 導入、hono/logger 置換。必須フィールド method / path / status / requestId、エラー時 stack（500 応答ボディは不変 — BR-012）。テスト: ログの JSON パース + 必須フィールド assert
- [ ] 8. **CMP-002: CORS 撤去 API 側（RF-12 / functional Q2=a）** — `hono/cors` の import と `app.use("*", cors())` を削除（IaC 側 corsPreflight は Step 11 / CH-4）
- [ ] 9. **CMP-001: RF-05 / RF-08 / RF-09** — ミューテーション失敗のユーザー可視エラー表示 + 未処理 rejection 解消（BR-011）/ createdAt の人間可読表示（WF-002 表示要素 3 点）/ 未使用 `fetchTodo` 削除（API-003 エンドポイント自体は維持）。テスト: 失敗時エラー表示 / createdAt 表示
- [ ] 10. **CMP-001: build 二重出力解消（RF-13）** — `build` を `vite build` のみに（`tsc` は typecheck へ分離 — CI が実行）
- [ ] 各ステップ末: `pnpm lint` / `pnpm test` green。フェーズ末: `pnpm build` + E2E 全 green（BP-1 確認）
- [ ] （Q3=a の場合）**P1 完了報告 — 停止**

### P2 — 基盤（RF-14〜22）

- [ ] 11. **IaC 変更 + infrastructure テスト（RF-14/15/17 + RF-16 IaC 側）** — `todo-stack.ts` へ CH-1〜CH-10 を適用（PITR 移行 / 明示 LogGroup / IAM 5 アクション / corsPreflight 削除 / OriginVerifySecret / customHeaders / ORIGIN_VERIFY_SECRET / アラーム 4 種 + SNS / CfnOutput 整理）。`test/todo-stack.test.ts` を IT-1〜IT-10 で拡充。検証: `pnpm --filter @todo-ai-dlc/infrastructure test` + synth green（synth テンプレートに平文 0 件）
- [ ] 12. **CMP-002: オリジン検証ミドルウェア（RF-16 API 側 / BR-013 / QT-4 / D-1）** — `x-origin-verify` と `ORIGIN_VERIFY_SECRET` の一致検証・不一致/欠落 403・常時有効（フェイルオープンなし）。dev 値 `local-dev-only` をローカル 3 箇所（docker-compose / Vite proxy / Playwright）へ注入（C-5）。テスト: 一致 / 不一致 / 欠落 + E2E BT-7（誤 403 回帰検知）
- [ ] 13. **依存メジャー更新（RF-18 — 範囲 = Q2 回答）** — Vitest 3 / Vite 7 / Biome 2 / CDK 現行版（完全固定維持 — C-2）。C-7: `node:20-slim` が ≥ 20.19 であることを確認（不適合なら 20 系内で更新）。検証: lint / typecheck / test / build / synth / E2E 全 green
- [ ] 14. **Renovate 設定（RF-19 / QT-8）** — `renovate.json`（minor/patch グループ化、pnpm workspace 対応）
- [ ] 15. **デプロイ 1 コマンド化 + README（RF-20）** — frontend build → cdk deploy の順序を内包するスクリプト、SNS 購読手順 1 行（`AlarmTopicArn` 出力参照 — D-5）
- [ ] 16. **ローカル開発堅牢化（RF-21）** — `dev.ts` の PORT 環境変数化ほか docker-compose / Dockerfile.dev の堅牢化（業務振る舞い変更なし）
- [ ] 17. **文書の現状一致（RF-22①③ + v1 文書 — 範囲 = Q4 回答）** — TodoForm インライン編集記述 / SDK 戦略記述の修正（② PUT 部分更新は v2 文書化済み）
- [ ] フェーズ末: 全検証コマンド（lint / typecheck / test / build / synth / audit / E2E）green

### 仕上げ — 文書成果物（stage directory）

- [ ] 18. **implementation-map.md** — CMP / ENT / BR / API / QT / CH / IT → ソース・テスト・設定・スクリプトのトレース（テンプレート準拠。Coverage Gaps 含む）
- [ ] 19. **components.yaml / unit.md の copy-forward 拡張** — infrastructure-design 版をコピーし、既存ブロック不変のまま Implementation-References（実装ファイル / テスト / 設定参照・実装ステータス）のみ追記
- [ ] 20. state.json の本ステージ status を `artifact-generated` へ更新し、outputs を登録

## Out of Scope（本ステージで行わないこと）

- git commit / branch / push（orchestrator 管轄）・AWS への実デプロイ（RF-20 はスクリプト整備まで）
- OOS-1〜10（認証 / WAF / API 意味論変更 / zod v4 / OpenAPI / 複数環境 / RUM / 新機能）
- 上流決定の再決定（変更が必要と判明した場合は実装せず質問として報告する）
