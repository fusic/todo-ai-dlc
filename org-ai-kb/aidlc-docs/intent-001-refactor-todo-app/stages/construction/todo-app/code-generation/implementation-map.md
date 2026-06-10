# Implementation Map — code-generation / unit: todo-app (UNIT-001)

> Stage: code-generation / Owner: aidlc-sw-dev-engineer-agent / 2026-06-10
> Trace generated code back to the copied-forward blueprint. Every source, test, config, and data artifact maps to at least one stable design ID.
> パスはすべてワークスペースルート（`todo-ai-dlc/`）相対。設計の正: entities.yaml / rules.yaml /
> api-specification.md（functional-design）、nfr-specification.md（QT/D/C）、infrastructure-specification.md（CH/IT）。
> 検証証跡（最終）: lint green / typecheck 4 パッケージ green / unit テスト **99 件** green（shared 16 / backend 42 /
> frontend 24 / infrastructure 17）/ build green / `cdk synth` exit 0（deprecation 0）/ `pnpm audit --audit-level=high`
> exit 0（ignore 0 件）/ E2E 2/2 green。

## Source Mapping

| Blueprint ID | Type | Design Source | Implementation Files | Tests |
|---|---|---|---|---|
| CMP-001 | component | components.yaml | `packages/frontend/src/App.tsx`, `components/TodoForm.tsx`, `components/TodoItem.tsx`, `components/TodoList.tsx`, `api/todoApi.ts`, `main.tsx` | `packages/frontend/src/App.test.tsx`, `components/TodoForm.test.tsx`, `components/TodoItem.test.tsx`, `components/TodoList.test.tsx`（24 件）+ `e2e/todo-smoke.spec.ts` |
| CMP-002 | component | components.yaml | `packages/backend/src/index.ts`, `routes/todos.ts`, `handlers/todoHandler.ts`, `repositories/todoRepository.ts`, `middleware/originVerify.ts`（ローカル専用エントリ: `dev.ts`） | `packages/backend/src/index.test.ts`, `handlers/todoHandler.test.ts`, `repositories/todoRepository.test.ts`, `middleware/originVerify.test.ts`（42 件）+ `e2e/todo-smoke.spec.ts` |
| CMP-003 | component | components.yaml | `packages/shared/src/constants.ts`, `types.ts`, `schemas.ts`, `index.ts`（公開面: package.json `exports` — `.` = 型+定数 / `./schemas` = zod schema、BR-014） | `packages/shared/src/schemas.test.ts`（16 件 — 境界値 + 型レベルアサーション） |
| ENT-001 | entity | entities.yaml | 形状・制約: `packages/shared/src/types.ts` / `constants.ts` / `schemas.ts`。ライフサイクル強制: `packages/backend/src/handlers/todoHandler.ts` / `repositories/todoRepository.ts` | `packages/shared/src/schemas.test.ts`, `packages/backend/src/handlers/todoHandler.test.ts`, `repositories/todoRepository.test.ts` |
| BR-001 / BR-002 | rule | rules.yaml | `packages/shared/src/schemas.ts`（zod）+ `constants.ts`（200/1000 の単一定義）。UX 入力補助: `TodoForm.tsx` / `TodoItem.tsx` の maxLength（共有定数参照） | `schemas.test.ts` 境界値 1/200/201/1000/1001（リテラル直書き = 独立検証点、Q3=a）、`todoHandler.test.ts` 400 応答 |
| BR-003 / BR-004 / BR-005 | rule | rules.yaml | `packages/backend/src/handlers/todoHandler.ts`（create: ULID 生成 / completed=false / ISO 8601 タイムスタンプ。update: updatedAt 再付与） | `todoHandler.test.ts`（生成値・初期化・タイムスタンプの assert） |
| BR-006 | rule | rules.yaml | `packages/shared/src/schemas.ts`（UpdateTodoSchema — 全フィールド任意）+ `todoHandler.ts` update（部分更新） | `schemas.test.ts`（空オブジェクト受理）、`todoHandler.test.ts` |
| BR-007 / QT-9 | rule | rules.yaml / nfr-specification.md | `packages/backend/src/repositories/todoRepository.ts`（update/delete の `ConditionExpression: attribute_exists(id)` — 単一呼出・TOCTOU 0） | `todoRepository.test.ts`（ConditionExpression + 呼出 1 回 + 条件失敗）、`todoHandler.test.ts`（不存在 id 404・新規作成なし） |
| BR-008 | rule | rules.yaml | `packages/backend/src/handlers/todoHandler.ts`（readJsonBody — 解釈不能 400） | `todoHandler.test.ts`（POST / PUT の不正 JSON 400 + 書込未到達） |
| BR-009 | rule | rules.yaml | `todoHandler.ts`（評価順序: ボディ解釈 → 検証 → 書込 — 400 が 404 に優先） | `todoHandler.test.ts`（複合ケース 400 優先） |
| BR-010 | rule | rules.yaml | `todoHandler.ts`（sortForList — createdAt 降順・tie id 降順） | `todoHandler.test.ts`（順序 + tie-break 決定性 2 件） |
| BR-011 | rule | rules.yaml | `packages/frontend/src/App.tsx`（actionError + `app-action-error` バナー）、`TodoForm.tsx` / `TodoItem.tsx`（失敗時の入力値保持・編集モード維持） | `App.test.tsx`（失敗 4 件）、`TodoForm.test.tsx` / `TodoItem.test.tsx`（保持・維持） |
| BR-012 | rule | rules.yaml | `packages/backend/src/index.ts`（onError — 固定 500 ボディ + サーバー側構造化ログに stack） | `index.test.ts`（500 固定ボディ + stack 記録） |
| BR-013 / QT-4 | rule | rules.yaml / nfr-specification.md | API 側: `packages/backend/src/middleware/originVerify.ts`（一致検証・403・常時有効フェイルクローズ）。IaC 側: `packages/infrastructure/lib/todo-stack.ts`（CH-5/6/7 — Secret 自動生成・CloudFront customHeaders・Lambda env）。dev 値注入: `docker-compose.yml` / `packages/frontend/vite.config.ts`（proxy headers）/ `playwright.config.ts`（extraHTTPHeaders）+ `dev.ts` 既定値（ホスト直接起動） | `middleware/originVerify.test.ts`（一致/不一致/欠落/フェイルクローズ 4 件）、`index.test.ts`（配線 403 + ログ記録）、`test/todo-stack.test.ts` IT-3/4/5、`e2e/todo-smoke.spec.ts` BT-7（誤 403 回帰検知） |
| BR-014 | rule | rules.yaml | `packages/shared/package.json`（exports 分離: `.` / `./schemas`）。検証強制は CMP-002 のみ（frontend に zod 依存なし） | 構造的担保: typecheck（CI）+ `schemas.test.ts` 型レベルアサーション |
| API-001〜API-005 | API | api-specification.md | `packages/backend/src/routes/todos.ts` + `handlers/todoHandler.ts`（POST / GET / GET:id / PUT / DELETE） | `todoHandler.test.ts`（正常 + 400/404/複合）、E2E BT-1〜5 |
| API-006 | API | api-specification.md | `packages/backend/src/index.ts`（GET /api/health） | `index.test.ts`、E2E BT-7（200 + `{status:"ok"}`） |
| QT-1 / QT-2 / QT-6（アラーム） | NFR | nfr-specification.md / infrastructure-specification.md | `packages/infrastructure/lib/todo-stack.ts`（CH-8: LambdaDurationP95Alarm / ApiLatencyP99Alarm / LambdaErrorsAlarm / Api5xxAlarm + AlarmTopic + SnsAction、CH-10: AlarmTopicArn 出力） | `test/todo-stack.test.ts` IT-6 / IT-7 |
| QT-5（IAM 最小権限） | NFR | nfr-specification.md | `todo-stack.ts`（CH-3: `todoTable.grant` 5 アクション限定） | IT-1（ちょうど 5 アクション） |
| QT-6（構造化ログ） | NFR | nfr-specification.md | `packages/backend/src/index.ts`（Powertools Logger — アクセスログ + onError）+ `todo-stack.ts`（CH-2: 明示 LogGroup 90 日） | `index.test.ts`（JSON パース + 必須フィールド）、IT-8 |
| QT-7（CI 検証ゲート） | NFR | nfr-specification.md | `.github/workflows/ci.yml`（lint / typecheck / test / synth / audit / e2e の 6 ジョブ）、`playwright.config.ts` + `e2e/todo-smoke.spec.ts` | CI 各ジョブ相当コマンドのローカル実行（全 green）。CI 実体の確認は push 後（orchestrator） |
| QT-8（依存健全性） | NFR | nfr-specification.md | `renovate.json`（minor/patch グループ化・zod major 凍結・CDK pin 維持）、CI audit ジョブ（high 閾値 — D-3） | `pnpm audit --audit-level=high` exit 0（ignore 0 件） |
| CH-1〜CH-10 | infrastructure | infrastructure-specification.md | `packages/infrastructure/lib/todo-stack.ts`（全 10 件適用 — PITR 移行 / 明示 LogGroup / IAM 5 アクション / corsPreflight 削除 / OriginVerifySecret / customHeaders / ORIGIN_VERIFY_SECRET env / アラーム 4 種 + SNS / ApiUrl 説明文 / AlarmTopicArn） | `test/todo-stack.test.ts`（IT-1〜IT-10 + 既存 7 件 = 17 件） |
| IT-1〜IT-10 | infrastructure test | infrastructure-specification.md | `packages/infrastructure/test/todo-stack.test.ts`（専用 describe ブロック） | 自身（17/17 green。synth テンプレートに平文 0 件 = IT-3/4/5） |

## Configuration Mapping

| Blueprint ID | Config / Script | Purpose | Source Decision |
|---|---|---|---|
| UNIT-001 | `.github/workflows/ci.yml` | CI 6 ジョブ（QT-7。synth ジョブは frontend build 先行 — DEP-O2） | RF-01/02 / D-3 / D-7 |
| UNIT-001 | `package.json`（root） | `deploy` script（frontend build → cdk deploy の順序内包 — RF-20）、typecheck / test:e2e / lint scripts、Biome 2.4.16 | RF-20 / RF-18 / DEP-O2 |
| UNIT-001 | `renovate.json` | 依存自動更新（minor/patch グループ化、zod major 凍結 = OOS-6、CDK pin 維持 = C-2） | RF-19 / QT-8 |
| UNIT-001 | `pnpm-workspace.yaml` | workspace 定義。audit ignore は 0 件（GHSA-5xrq-8626-4rwp は Vitest 3 更新で解消・削除 — C-6 運用） | RF-18 / D-3 / C-6 |
| UNIT-001 | `docker-compose.yml` | ローカル環境（A-7）。backend へ `ORIGIN_VERIFY_SECRET=local-dev-only` 注入（C-5） | D-1 / C-5 / RF-16 |
| UNIT-001 | `Dockerfile.dev` | lockfile 固定強制（フォールバック撤去）+ 非 root（node）実行 | RF-21 / SECURITY-10 |
| UNIT-001 | `packages/frontend/vite.config.ts` | Vite proxy が dev 値ヘッダ `x-origin-verify` を注入（ローカル経路 — D-1） | RF-16 / C-5 |
| UNIT-001 | `playwright.config.ts` | E2E 設定（baseURL / trace / extraHTTPHeaders に dev 値） | RF-02 / D-7 / C-5 |
| UNIT-001 | `biome.json` | Biome 2 設定（`biome migrate` で移行 — files.includes / assist.organizeImports） | RF-18 |
| UNIT-001 | `packages/infrastructure/package.json` | aws-cdk-lib 2.258.1 / aws-cdk 2.1126.0（完全固定宣言維持） | RF-18 / C-2 / SECURITY-10 |
| UNIT-001 | `packages/backend/src/dev.ts` | ローカル専用エントリ — PORT 環境変数（既定 3001）+ dev 値の既定補完（ホスト直接起動） | RF-21 / C-5 |
| ENT-001 | `docker-compose.yml`（dynamodb-setup サービス） | DynamoDB Local の TodoTable 作成（データスクリプト相当 — 既存据置） | A-7 / C-4 |

## Copied Blueprint Expansions

| Blueprint ID | Expansion Target | Implementation Detail Added |
|---|---|---|
| CMP-001 / CMP-002 / CMP-003 | `components.yaml`（本ステージ版 — infrastructure-design 版から copy-forward） | 各 Component に Implementation-References ブロックのみ追加（ソース / テスト / 設定参照。既存ブロックは不変） |
| UNIT-001 | `unit.md`（本ステージ版 — infrastructure-design 版から copy-forward） | 「実装ステータス（code-generation で追記）」節のみ追加（RF 別の実装状況・ファイル / テスト / 設定参照・検証証跡） |

## Coverage Gaps

| Blueprint ID | Gap | Resolution |
|---|---|---|
| QT-7（CI 実体） | GitHub Actions 上での 6 ジョブ green は push 後にしか確認できない（git 操作は orchestrator 管轄） | 全ジョブ相当コマンドをローカルで実行し green を確認済み。push 後の CI 確認 + ブランチ保護有効化（手動）を orchestrator / 人間へ申し送り |
| QT-6（SNS 通知到達） | SNS 購読は設計上の手動ステップ（D-5 — 個人メールを構成に載せない） | README「AWS へのデプロイ」節に購読 1 行を記載（AlarmTopicArn 出力参照）。デプロイ後に人間が実施 |
| QT-1 / QT-2（実測） | レイテンシ実測値は AWS 実環境デプロイ後にのみ観測可能（本ステージはデプロイしない） | アラーム 4 種が計測装置として synth テンプレートに存在（IT-6 で assert）。実測は運用フェーズ |
| BR-013（本番経路の実機検証） | CloudFront → API GW の実ヘッダ付与はデプロイ後にのみ検証可能 | IT-4/IT-5（テンプレート上の注入）+ ローカル同一コードパスの E2E（BT-1〜5 + BT-7）で代替。デプロイ後は ApiUrl 直接アクセス 403 で確認可能（CH-9 の説明文） |
| RF-18（dev 環境 Node） | ローカル開発コンテナは `node:20-slim`（v20.20.2）— Vite 7 要件 ≥20.19 を満たすが Node 20 系は保守終了が近い | C-7 の確認結果として記録（メジャー変更は BP-1 範囲外 — 将来の Renovate / intent で対応） |
