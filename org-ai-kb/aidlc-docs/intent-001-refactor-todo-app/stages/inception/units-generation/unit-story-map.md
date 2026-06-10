# Unit Story Map — refactor-todo-app

> Stage: units-generation / Owner: aidlc-app-architect-agent
> **Story fallback（plan.md 記載）**: stories.md 不在（story-generation 未実施）のため、business-overview.md の **BT-1〜BT-7** と requirements.md の **RF-01〜RF-22** を story 相当としてマップする。ID・内容は原典から保存（blueprint identity 維持）。
> **Q3=a**: 優先度フェーズ列（P0/P1/P2）を設け、construction 内の実施順序ガイドとする。BT 行は実装順序の対象ではなく BP-1 の保持対象のため、フェーズ列は「保持（全フェーズ）」と表記する。
> 凡例: 着地 = RF の変更が実装されるコンポーネント / 非コンポーネント要素（components.md の RF トレーサビリティ表と一致）。

## Coverage Matrix（全 29 行 — BT 7 件 + RF 22 件、漏れゼロ）

| Story | Unit(s) | Coverage type | フェーズ | 備考 |
|---|---|---|---|---|
| BT-1 TODO 作成 | todo-app | fully implemented | 保持（全フェーズ） | 操作面 CMP-001 / API 面 CMP-002。完全保持。unit + E2E で検証 |
| BT-2 TODO 一覧表示 | todo-app | fully implemented | 保持（全フェーズ） | 保持 + 表示順保証（RF-06）と createdAt 表示（RF-08）を追加。unit + E2E |
| BT-3 TODO 編集 | todo-app | fully implemented | 保持（全フェーズ） | 完全保持（インライン編集 UX を正とする — Q1 BO-O3）。unit + E2E |
| BT-4 完了状態の切替 | todo-app | fully implemented | 保持（全フェーズ） | 完全保持（API 上は BT-3 と同じ PUT）。unit + E2E |
| BT-5 TODO 削除 | todo-app | fully implemented | 保持（全フェーズ） | 完全保持。unit + E2E |
| BT-6 TODO 個別取得 | todo-app | fully implemented | 保持（全フェーズ） | API エンドポイント維持。フロント未使用クライアント `fetchTodo` のみ削除（RF-09）。backend unit で検証 |
| BT-7 ヘルスチェック | todo-app | fully implemented | 保持（全フェーズ） | 完全保持。RF-16 後も `/api/health` は同一オリジンで到達可能。backend unit + E2E（RF-02 にアサーション） |
| RF-01 CI 検証ゲート | todo-app | fully implemented | **P0** | 非コンポーネント（CI）。全 workspace + synth + audit。audit 閾値は設計委譲（units.md 申し送り #4） |
| RF-02 E2E スモーク | todo-app | fully implemented | **P0** | 非コンポーネント（E2E）。BT-1〜5 + BT-7。docker-compose 環境（A-7） |
| RF-03 コントラクト一元化 | todo-app | fully implemented | **P0** | CMP-003（新設）。CMP-001/002 の重複定義置換 + `workspace:` 依存追加を伴う。テストリテラルの扱いは設計委譲（#5） |
| RF-04 不正 JSON の 400 化 | todo-app | fully implemented | P1 | CMP-002。BP-1 許容変更 1（Q2=b 承認 4 件の一部） |
| RF-05 ミューテーション失敗のエラー表示 | todo-app | fully implemented | P1 | CMP-001。未処理 rejection 解消を含む。BP-1 許容変更 1 |
| RF-06 一覧表示順の保証 | todo-app | fully implemented | P1 | **CMP-001 または CMP-002（択一・設計委譲 — #1）**。単一 unit のためどちらに着地しても本表は不変。BP-1 許容変更 1 |
| RF-07 更新・削除の条件付き書込化 | todo-app | fully implemented | P1 | CMP-002。複合ケース 400/404 は BP-1 許容変更 4。NFR-001 充足にも寄与 |
| RF-08 createdAt の UI 表示 | todo-app | fully implemented | P1 | CMP-001。FR-002 ドリフト解消。BP-1 許容変更 2 |
| RF-09 未使用 `fetchTodo` の削除 | todo-app | fully implemented | P1 | CMP-001。`GET /api/todos/:id`（BT-6）自体は CMP-002 が維持 |
| RF-10 構造化リクエストログ | todo-app | fully implemented | P1 | CMP-002。NFR-005 の基礎 |
| RF-11 エラースタックのサーバーログ出力 | todo-app | fully implemented | P1 | CMP-002。500 応答ボディ不変（SECURITY-09 維持） |
| RF-12 CORS の一元化 | todo-app | fully implemented | P1 | **CMP-002 + IaC の共同着地** — 単一 unit 内で完結（Q2=a の利点）。集約先は設計委譲（#2）。BP-1 許容変更 5 |
| RF-13 frontend build の二重出力解消 | todo-app | fully implemented | P1 | CMP-001。typecheck 分離は CI（RF-01）で実行 |
| RF-14 IAM 最小権限化 | todo-app | fully implemented | P2 | 非コンポーネント（IaC）。5 アクション限定 |
| RF-15 CloudWatch アラーム 4 種 | todo-app | fully implemented | P2 | 非コンポーネント（IaC）。NFR-001 の計測可能化。統計・評価期間は設計委譲（#6） |
| RF-16 execute-api 直接アクセスの 403 化 | todo-app | fully implemented | P2 | **CMP-002 + IaC の共同着地** — 単一 unit 内で完結。ローカル経路方式は設計委譲（#3）。BP-1 許容変更 3 |
| RF-17 CDK deprecated プロパティ移行 | todo-app | fully implemented | P2 | 非コンポーネント（IaC）。RF-18 と同時実施が効率的 |
| RF-18 依存メジャー更新 | todo-app | fully implemented | P2 | 非コンポーネント（依存管理）。全 workspace 横断。P0 ゲート確立後に安全に実施 |
| RF-19 依存自動更新（Renovate 等） | todo-app | fully implemented | P2 | 非コンポーネント（依存管理）。NFR-007 |
| RF-20 デプロイ手順のスクリプト化 | todo-app | fully implemented | P2 | 非コンポーネント（デプロイ/開発基盤）。unit-dependencies.md の Build Order と整合 |
| RF-21 ローカル開発環境の堅牢化 | todo-app | fully implemented | P2 | 非コンポーネント（開発環境）。`dev.ts` PORT 環境変数化は CMP-002 開発用エントリへの軽微な波及（業務振る舞い変化なし） |
| RF-22 仕様・設計記述の現状一致 | todo-app | fully implemented | P2 | 非コンポーネント（文書）。3 点（TodoForm / PUT 部分更新 / SDK 戦略）。v1 文書の更新対象は #8 で construction 委譲 |

フェーズ別件数: **P0 = 3 件**（RF-01/02/03）/ **P1 = 10 件**（RF-04〜13）/ **P2 = 9 件**（RF-14〜22）/ **BT 保持対象 = 7 件**（BT-1〜7）— 計 29 行。

## Per-Unit Story Assignment

### todo-app（UNIT-001）

単一 unit のため全 29 行を本 unit が実装・保持する。construction の実施順序（Q3=a — Q4=c「安全な改修順序」の翻訳）:

| フェーズ | 実施内容 | 本 unit が実装する具体 |
|---|---|---|
| **P0（最初 — 他のすべての前提）** | 検証ゲートとコントラクト一元化 | RF-01（CI: lint/typecheck/test/synth/audit の 1 ゲート）→ RF-02（E2E: BT-1〜5 + BT-7）→ RF-03（CMP-003 新設・重複定義置換）。以降の全変更はこのゲートに保護されて実施される |
| **P1（P0 ゲート確立後）** | backend / frontend の実装品質 | CMP-002: RF-04/07/10/11 + RF-12 の API 側。CMP-001: RF-05/08/09/13。択一: RF-06（CMP-001 or CMP-002 — 設計委譲）。共同: RF-12（+ IaC 側） |
| **P2（最後 — 基盤）** | インフラ刷新・依存・開発基盤・文書 | IaC: RF-14/15/17 + RF-16 の IaC 側。CMP-002: RF-16 の API 側。依存管理: RF-18/19。開発基盤: RF-20/21。文書: RF-22 |
| **全フェーズ横断** | BT-1〜BT-7 の振る舞い保持（BP-1） | 各フェーズの変更後も既存 45 テスト + E2E がパスし続けること。許容変更は BP-1 列挙の 5 件のみ |

## BP-1 / NFR の検証責務（付記）

すべて UNIT-001 が単独で担う（unit 跨ぎの検証分担は存在しない）。

| ID | 検証責務の担保（unit 内のどの RF が担うか） |
|---|---|
| BP-1 | 検証装置 = RF-01（CI: 既存 45 テストの全件パス）+ RF-02（E2E: BT-1〜5 の 1 周 + BT-7 の 200）。いずれも P0 で最初に確立。許容変更 5 件の対応 RF: 変更 1 = RF-04〜07（Q2=b 承認 4 件）/ 変更 2 = RF-08 / 変更 3 = RF-16 / 変更 4 = RF-07 複合ケース / 変更 5 = RF-12 |
| NFR-005（観測性） | RF-10/11（CMP-002 の構造化ログ・スタックログ）+ RF-15（IaC のアラーム 4 種） |
| NFR-006（継続的検証） | RF-01（CI ゲート — shared 含む全 workspace 対象）+ RF-02（E2E の CI 組み込み） |
| NFR-007（依存健全性） | RF-19（Renovate 等の自動更新）+ RF-01 の `pnpm audit` |

## Coverage Gaps

unit に着地しない story / requirement（分解が完全なら空であるべき）:

| Story/Requirement | Gap | Resolution |
|---|---|---|
| （なし） | — | — |

**空であることの確認**: BT-1〜7（7 件）+ RF-01〜22（22 件）= 29 行すべてが UNIT-001 todo-app に着地。components.md の着地集計（CMP-001 = 4 / CMP-002 = 4 / CMP-003 = 1 / CMP-001/002 択一 = 1 / CMP-002+IaC 共同 = 2 / 非コンポーネント単独 = 10、計 22 件全着地）と本表の備考列が 1:1 で一致することを確認済み。
