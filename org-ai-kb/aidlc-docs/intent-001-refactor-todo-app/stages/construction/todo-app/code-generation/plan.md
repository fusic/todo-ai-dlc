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

- [x] 4. **CMP-002: zod 強制 + 不正 JSON 400（RF-04 / BR-008 / BR-009）** — handler の評価順序を「ボディ解釈 → 入力検証 → 書込」に固定。JSON 解釈不能は 400。テスト: 不正 JSON 400 / 有効入力の応答不変
  - 実施: `todoHandler.ts` に `readJsonBody` ヘルパー（try/catch → 400 `{error: "Invalid JSON body"}`）。create / update とも「ボディ解釈 → 検証 → 書込」順に固定。テスト 2 件追加（POST / PUT の不正 JSON 400 + 書込未到達）。lint green / backend 23 件 green
- [x] 5. **CMP-002: 条件付き書込（RF-07 / BR-007 / QT-9）** — repository の update / delete を `ConditionExpression: attribute_exists(id)` の単一呼出に変更（DynamoDB 呼出 各 1 回）。404 は条件失敗例外で判定。テスト: 不存在 id の PUT が新規作成せず 404 / 複合ケース（不正ボディ × 不存在 id）は 400 優先（BR-009）/ 呼出回数 1 回
  - 実施: repository `update → Todo | null` / `delete → boolean`（条件失敗を name=`ConditionalCheckFailedException` で判定、他例外は伝播 = BR-012）。handler は findById 事前読取を撤去し条件失敗 → 404。テスト追加: 複合ケース 400 優先 / 空オブジェクト受理（BR-006）/ ConditionExpression + 呼出 1 回 / 条件失敗 null・false / 非条件例外の rethrow。lint green / backend 31 件 green / typecheck green
- [x] 6. **CMP-002: 一覧順序保証（RF-06 / BR-010）** — API-002 応答生成時に createdAt 降順・tie は id 降順でソート。テスト: 順序 + tie-break の決定性
  - 実施: `todoHandler.list` に `sortForList`（非破壊コピー + createdAt 降順・tie id 降順）。テスト 2 件追加（降順 / tie-break 決定性 — 走査順を変えて同一結果を assert）。lint green / backend 33 件 green
- [x] 7. **CMP-002: 構造化ログ（RF-10/11 / QT-6 / D-6）** — `@aws-lambda-powertools/logger` 導入、hono/logger 置換。必須フィールド method / path / status / requestId、エラー時 stack（500 応答ボディは不変 — BR-012）。テスト: ログの JSON パース + 必須フィールド assert
  - 実施: `@aws-lambda-powertools/logger@^2.33.1` を backend dependencies に追加（esbuild バンドル対象 — externalModules は @aws-sdk/* のみ）。index.ts: hono/logger と console.error を撤去し、アクセスログ middleware（requestId = Lambda awsRequestId / ローカル UUID、Hono Variables 経由）+ onError の構造化エラーログ（error オブジェクト → Powertools が name/message/stack を整形）。`index.test.ts` 新設 3 件（JSON パース + 必須フィールド / 404 の status 記録 / 500 固定ボディ + サーバー側 stack — POWERTOOLS_DEV で console spy）。エラー時はアクセスログ（status 500）とエラーログ（stack 付き）の両方が出ることを実測確認。lint green / backend 36 件 green / typecheck green
- [x] 8. **CMP-002: CORS 撤去 API 側（RF-12 / functional Q2=a）** — `hono/cors` の import と `app.use("*", cors())` を削除（IaC 側 corsPreflight は Step 11 / CH-4）
  - 実施: index.ts から cors を撤去し「CORS 0 箇所」の根拠コメントを記載。回帰ロックとして Origin ヘッダ付きリクエストでも `access-control-allow-origin` が出ないことを assert するテスト 1 件追加。lint green / backend 37 件 green
- [x] 9. **CMP-001: RF-05 / RF-08 / RF-09** — ミューテーション失敗のユーザー可視エラー表示 + 未処理 rejection 解消（BR-011）/ createdAt の人間可読表示（WF-002 表示要素 3 点）/ 未使用 `fetchTodo` 削除（API-003 エンドポイント自体は維持）。テスト: 失敗時エラー表示 / createdAt 表示
  - 実施: App.tsx に `actionError` 状態 + `app-action-error` バナー（閉じるボタン付き、読み込みエラーと別系統）。create/update は rethrow（TodoForm = 入力値保持 / TodoItem = 編集モード維持を各自 catch）、toggle/delete は App で握って表示のみ（fire-and-forget 呼出のため rethrow しない設計 — 未処理 rejection 0）。TodoItem に `createdAt` 表示（`Intl.DateTimeFormat("ja-JP")` を `createdAtFormatter` として export — TZ 非依存テスト）。todoApi から `fetchTodo` 削除。テスト 7 件追加（App 失敗 4 / TodoForm 保持 1 / TodoItem 編集維持 + createdAt 2）。lint green / frontend 24 件 green / typecheck green
- [x] 10. **CMP-001: build 二重出力解消（RF-13）** — `build` を `vite build` のみに（`tsc` は typecheck へ分離 — CI が実行）
  - 実施: frontend package.json の `build` から `tsc &&` を除去（型検査は既存 `typecheck` スクリプト = CI typecheck ジョブが担保）。dist に Vite 出力のみ存在することを確認。pnpm build green
- [x] 各ステップ末: `pnpm lint` / `pnpm test` green。フェーズ末: `pnpm build` + E2E 全 green（BP-1 確認）
- [x] （Q3=a の場合）**P1 完了報告 — 停止**

#### P1 完了記録（2026-06-10）

- 検証証跡（最終）: `pnpm lint` green（biome 47 files）/ `pnpm test` green **84 件**（shared 16 / backend 37 / frontend 24 / infrastructure 7 — P0 完了時 61 + 新規 23）/ `pnpm typecheck` green（4 パッケージ）/ `pnpm build` green / `pnpm --filter @todo-ai-dlc/infrastructure synth` exit 0 / `pnpm audit --audit-level=high` exit 0 / `pnpm test:e2e` **2/2 green**（chromium + DynamoDB Local — BT-1〜5 + BT-7）
- 実環境証跡: docker compose 環境の backend 実ログで Powertools JSON（level/service/method/path/status/requestId）を確認。E2E 実行時の PUT/DELETE が条件付き書込経由で 200/204
- 新規ファイル: `packages/backend/src/index.test.ts`（構造化ログ + CORS 0 箇所の回帰テスト 4 件）
- 変更ファイル: backend（index.ts = Powertools ログ/onError/CORS 撤去、handlers/todoHandler.ts = readJsonBody/sortForList/条件失敗 404、repositories/todoRepository.ts = ConditionExpression、package.json = @aws-lambda-powertools/logger 追加、todoHandler.test.ts / todoRepository.test.ts 拡充）、frontend（App.tsx = actionError バナー、TodoForm.tsx / TodoItem.tsx = 失敗時 UI 保持 + createdAt 表示、api/todoApi.ts = fetchTodo 削除、package.json = build から tsc 分離、App/TodoForm/TodoItem テスト拡充）、pnpm-lock.yaml
- BP-1 への影響: 振る舞い変化は承認済み許容変更のみ — ①不正 JSON 500→400（許容変更 1）②一覧順序保証（同 1）③複合ケース 404→400（同 4）④CORS ヘッダ消失（同 5）。BT-1〜7 は unit + E2E で不変を確認
- 残課題（orchestrator / 人間へ）: ① docker compose の node_modules named volume は依存追加後に `docker compose down -v` での再作成が必要（今回実測 — CI は毎回新規 runner のため影響なし。README 追記は P2 RF-21 で検討） ② AWS SDK が node 20 への警告（>=22 推奨）を出力 — C-7 確認（P2 Step 13）の材料 ③ IaC 側 corsPreflight 削除（CH-4）は P2 Step 11

### P2 — 基盤（RF-14〜22）

- [x] 11. **IaC 変更 + infrastructure テスト（RF-14/15/17 + RF-16 IaC 側）** — `todo-stack.ts` へ CH-1〜CH-10 を適用（PITR 移行 / 明示 LogGroup / IAM 5 アクション / corsPreflight 削除 / OriginVerifySecret / customHeaders / ORIGIN_VERIFY_SECRET / アラーム 4 種 + SNS / CfnOutput 整理）。`test/todo-stack.test.ts` を IT-1〜IT-10 で拡充。検証: `pnpm --filter @todo-ai-dlc/infrastructure test` + synth green（synth テンプレートに平文 0 件）
  - 実施: CH-1〜CH-10 全件適用。`pointInTimeRecoverySpecification` が aws-cdk-lib 2.177.0 に存在しないため（requirements「RF-17 は RF-18 と同時実施」どおり）CDK 更新を本ステップで実施 — aws-cdk-lib **2.258.1** / aws-cdk **2.1126.0**（完全固定維持 — C-2）。IT-1〜IT-10 を既存 7 件と別 describe で追加（IT-1 は「ちょうど 5 アクション」、IT-4/IT-5 は `{{resolve:secretsmanager:` 動的参照、IT-8 は Custom::LogRetention 0 件 + 90 日保持、IT-10 は ApiUrl 説明文の 403 明記を assert）。検証: infrastructure 17/17 green / typecheck green / synth exit 0（deprecation 警告 0・動的参照 2 箇所・Custom::LogRetention 0）/ lint green
- [x] 12. **CMP-002: オリジン検証ミドルウェア（RF-16 API 側 / BR-013 / QT-4 / D-1）** — `x-origin-verify` と `ORIGIN_VERIFY_SECRET` の一致検証・不一致/欠落 403・常時有効（フェイルオープンなし）。dev 値 `local-dev-only` をローカル 3 箇所（docker-compose / Vite proxy / Playwright）へ注入（C-5）。テスト: 一致 / 不一致 / 欠落 + E2E BT-7（誤 403 回帰検知）
  - 実施: `middleware/originVerify.ts` 新設（期待値未設定もフェイルクローズ 403、403 ボディは `{error:"Forbidden"}` — 内部情報なし）。index.ts でアクセスログの後段に全ルート適用（403 拒否もログに残る）。注入 3 箇所 = docker-compose environment / Vite proxy headers / Playwright extraHTTPHeaders。加えてホスト直接起動（README 記載の開発経路）向けに dev.ts（ローカル専用エントリ・Lambda バンドル対象外）へ dev 既定値を補完 — ミドルウェアは常時有効のままで D-1 不変。テスト 5 件追加（middleware 4: 一致/不一致/欠落/フェイルクローズ + index 配線 1: 403 + アクセスログ記録）。backend 42 件 green / lint / typecheck green
- [x] 13. **依存メジャー更新（RF-18 — 範囲 = Q2 回答）** — Vitest 3 / Vite 7 / Biome 2 / CDK 現行版（完全固定維持 — C-2）。C-7: `node:20-slim` が ≥ 20.19 であることを確認（不適合なら 20 系内で更新）。検証: lint / typecheck / test / build / synth / E2E 全 green
  - 実施: Vitest **^3.2.6**（4 パッケージ — テストコード変更なしで green）/ Vite **^7.3.5** + peer 随伴 @vitejs/plugin-react **^5.2.0**（6.x は Vite 8 専用のため不採用。jsdom / tailwindcss はレンジ内のまま）/ Biome **2.4.16**（`biome migrate --write` で設定移行 + 新規 error の useExhaustiveDependencies に App.tsx の loadTodos useCallback 化で対応 — マウント時 1 回実行の振る舞い不変）/ CDK は Step 11 で 2.258.1 / CLI 2.1126.0 へ更新済み（完全固定維持）。**GHSA-5xrq-8626-4rwp の ignore を削除**（package.json の pnpm.auditConfig + auditIgnoreReasons ブロックごと撤去、pnpm-workspace.yaml は運用コメントのみ残置）→ `pnpm audit --audit-level=high` exit 0（ignore 0 件）。C-7: `node:20-slim` = **v20.20.2 ≥ 20.19** 確認（イメージ変更不要）。react は runtime 単一版 19.2.4（「19.2.14」は @types/react — 併存なしを確認、`pnpm dedupe` 実施）。検証: lint / typecheck / test 99 件 / build / synth すべて green
- [x] 14. **Renovate 設定（RF-19 / QT-8）** — `renovate.json`（minor/patch グループ化、pnpm workspace 対応）
  - 実施: `renovate.json` 新設 — config:recommended + minor/patch の単一グループ化 + zod major 凍結（OOS-6 の設計決定を設定として明文化）+ CDK は rangeStrategy: pin（C-2 完全固定維持）
- [x] 15. **デプロイ 1 コマンド化 + README（RF-20）** — frontend build → cdk deploy の順序を内包するスクリプト、SNS 購読手順 1 行（`AlarmTopicArn` 出力参照 — D-5）
  - 実施: root package.json に `deploy` script（frontend build → cdk deploy の順序内包 — DEP-O2）。README に「AWS へのデプロイ」節（1 コマンド + 手動 2 ステップ = SNS 購読 1 行・ブランチ保護 + ApiUrl 直接アクセス 403 の説明）
- [x] 16. **ローカル開発堅牢化（RF-21）** — `dev.ts` の PORT 環境変数化ほか docker-compose / Dockerfile.dev の堅牢化（業務振る舞い変更なし）
  - 実施: Dockerfile.dev — `|| pnpm install` フォールバック撤去（lockfile 不整合はビルド失敗）+ 非 root（node ユーザー）実行 + `COPY pnpm-lock.yaml` 必須化（glob `*` 撤去）。dev.ts の PORT 環境変数化（既定 3001）は Step 12 で実施済み。README に依存更新後の `docker compose down -v` 手順を追記（P1 残課題①の解消）
- [x] 17. **文書の現状一致（RF-22①③ + v1 文書 — 範囲 = Q4 回答）** — TodoForm インライン編集記述 / SDK 戦略記述の修正（② PUT 部分更新は v2 文書化済み）
  - 実施: ① TodoForm 作成専用 + TodoItem インライン編集（application-design.md / components.md / unit-of-work.md の 4 箇所）② PUT 部分更新意味論の注記（application-design.md API 表 — 正式仕様は v2 API-004 へのポインタ）③ SDK 戦略 = externalModules でバンドル除外・ランタイム同梱版依存を明文化（application-design.md 技術決定表）。Q4=b: バナー 1 行を主要 5 ファイル（requirements.md / application-design.md / components.md / unit-of-work.md / infrastructure-design.md）冒頭に追加
- [x] フェーズ末: 全検証コマンド（lint / typecheck / test / build / synth / audit / E2E）green
  - lint green（biome 2.4.16 / 51 files）/ typecheck 4 パッケージ green / test **99 件** green（shared 16 / backend 42 / frontend 24 / infrastructure 17）/ build green / synth exit 0（deprecation 0）/ audit exit 0（ignore 0 件）/ E2E 2/2 green（クリーン volume + 新 Dockerfile.dev で再ビルドした compose 環境）

### 仕上げ — 文書成果物（stage directory）

- [x] 18. **implementation-map.md** — CMP / ENT / BR / API / QT / CH / IT → ソース・テスト・設定・スクリプトのトレース（テンプレート準拠。Coverage Gaps 含む）
  - 実施: テンプレート 4 節構成（Source Mapping = CMP×3 / ENT-001 / BR-001〜014 / API-001〜006 / QT / CH-1〜10 / IT-1〜10、Configuration Mapping = UNIT-001 の設定 12 件、Copied Blueprint Expansions、Coverage Gaps 5 件 — CI 実体 / SNS 購読 / レイテンシ実測 / 本番経路実機 / Node 20 EOL）
- [x] 19. **components.yaml / unit.md の copy-forward 拡張** — infrastructure-design 版をコピーし、既存ブロック不変のまま Implementation-References（実装ファイル / テスト / 設定参照・実装ステータス）のみ追記
  - 実施: components.yaml = ヘッダに code-generation 追記履歴 + 各 CMP に Implementation-References（Status / Sources / Tests / Config）のみ追加。unit.md = ヘッダ更新（旧ヘッダ保存）+ 末尾に「実装ステータス」節（RF 別状況・検証証跡・残余 3 件）のみ追加。既存ブロックはすべて不変
- [x] 20. state.json の本ステージ status を `artifact-generated` へ更新し、outputs を登録

### P2 + 仕上げ完了記録（2026-06-10）

- 検証証跡（最終）: `pnpm lint` green（Biome 2.4.16 / 51 files）/ `pnpm typecheck` green（4 パッケージ）/ `pnpm test` green **99 件**（shared 16 / backend 42 / frontend 24 / infrastructure 17 — P1 完了時 84 + 新規 15）/ `pnpm build` green / `cdk synth` exit 0（deprecation 0・Custom::LogRetention 0・動的参照 2・平文 0）/ `pnpm audit --audit-level=high` exit 0（**ignore 0 件**）/ `pnpm test:e2e` **2/2 green**（クリーン volume + 新 Dockerfile.dev 再ビルド環境）
- 実機確認（compose 環境の backend 直接アクセス）: ヘッダなし 403 / dev ヘッダ 200 / 誤ヘッダ 403（BR-013 フェイルクローズ実証）
- 新規ファイル: `packages/backend/src/middleware/originVerify.ts`（+ test）、`renovate.json`、stage 文書 3 点（implementation-map.md / components.yaml / unit.md）
- 変更ファイル: `packages/infrastructure/lib/todo-stack.ts`（CH-1〜10）/ `test/todo-stack.test.ts`（IT-1〜10）/ infrastructure・全パッケージ package.json（CDK 2.258.1・CLI 2.1126.0 / Vitest 3.2.6 / Vite 7.3.5 / plugin-react 5.2.0 / Biome 2.4.16）/ root package.json（deploy script・ignore 削除）/ pnpm-workspace.yaml（ignore 削除）/ biome.json（migrate）/ docker-compose.yml・vite.config.ts・playwright.config.ts・dev.ts（dev 値注入 + PORT）/ Dockerfile.dev（非 root・lockfile 強制）/ index.ts・index.test.ts（ミドルウェア配線）/ App.tsx（useCallback）/ README.md（デプロイ節・volume 手順）/ v1 aidlc-docs 5 ファイル（3 点修正 + バナー）/ pnpm-lock.yaml
- BP-1 への影響: P2 の新規振る舞い変化は**許容変更 3（直接アクセス 403）のみ**。BT-1〜7 は unit + E2E で不変を確認。意図経路（CloudFront / ローカル proxy）の全 BT 動作は E2E が証明
- 残課題（orchestrator / 人間へ）: ① P2 変更のコミット + push 後の CI 実体 green 確認 ② ブランチ保護有効化（手動）③ AWS 実デプロイ（`pnpm run deploy`）+ SNS 購読 1 行（手動）④ Node 20 系の保守終了接近（AWS SDK 警告 — 将来 intent）

## Out of Scope（本ステージで行わないこと）

- git commit / branch / push（orchestrator 管轄）・AWS への実デプロイ（RF-20 はスクリプト整備まで）
- OOS-1〜10（認証 / WAF / API 意味論変更 / zod v4 / OpenAPI / 複数環境 / RUM / 新機能）
- 上流決定の再決定（変更が必要と判明した場合は実装せず質問として報告する）
