# Plan — nfr-design / unit: todo-app (UNIT-001)

> Stage: nfr-design / Owner: aidlc-systems-architect-agent / 2026-06-10
> 目的: requirements の NFR（NFR-001〜007）と RF のうち非機能側の設計委譲分を、計測可能なターゲット・技術選定・
> パターン・トレードオフとして確定し、functional-design の blueprint（components.yaml / unit.md / api-specification.md）へ
> NFR 注釈を copy-forward 拡張で付与する。

## Artifact Resolution（work method 準拠 — 使用入力と fallback の記録）

| 必要な関心事 | 使用する成果物 | 備考 |
|---|---|---|
| NFR 要件（正） | `stages/inception/requirements-analysis/requirements.md`（refined 版）— NFR-001〜007、RF-01/02/10/11/14/15/16/18/19、BP-1、A-1〜A-7、OOS | 設計委譲句（「設計ステージで決定」）を本ステージの決定対象として抽出済み |
| 機能設計 blueprint（copy-forward 原本） | `stages/construction/todo-app/functional-design/` の `components.yaml` / `unit.md` / `api-specification.md` | stage definition の Required copy-forward。ID・境界・依存方向を不変のまま NFR 注釈を追記する |
| 業務ルールとの整合 | 同 `rules.yaml`（BR-008/010/012/013 が NFR と接続）/ `entities.yaml` / `functional-spec.md` | BR と二重定義しない（強制点の単一性 — BR-014 の思想） |
| 既存インフラ制約 | RE `technology-stack.md`（TS-O1〜O6）/ `architecture.md`（AR-O2/O3/O8 ほか） | Lambda 256MB/30s・Node.js 20・DynamoDB オンデマンド・ログ保持 90 日等は BP-1 下の所与制約 |
| unit 間契約 | **contract-design は本 workflow に不在（単一 unit のため skip）** | fallback: api-specification.md（functional-design 版）を provider 仕様の正として使用 — 上流 plan.md と同じ fallback を継続 |
| 上流レビューの申し送り | functional-design `aidlc-architecture-reviewer-agent-review.md` F-2 / F-3 | F-2: RF-11 は「500 非開示 = BR-012 で確定済み / スタックのログ出力 = 本ステージ」の分担を明記して二重定義を回避。F-3: BR-013 の「構成物に平文で保持しない」は OQ-1（本ステージ Q2）の決定で字句解釈を確定させる |

## スコープ境界

- **本ステージで決定する**: 計測可能な品質ターゲット（NFR-001〜007 の数値化・計測点）、tech stack 選定（構造化ログ / E2E / 通知 / Secret 管理方針）、NFR を満たすパターン（条件付き書込・オリジン検証・CI ゲート・アラーム構成）、トレードオフと制約の明文化、blueprint への NFR 注釈
- **決定しない**: 具体の CDK construct 構成・リソース定義（infrastructure-design）、コード実装・Hono ミドルウェア接続（code-generation）、機能ルールの再定義（rules.yaml が正 — 参照のみ）
- 番号衝突注意: 本ステージ questions.md の Q1〜Q7 はステージローカル系列（requirements Q1〜Q4 / functional-design Q1〜Q5 とは別物）

## Steps

### Step 1 — Plan and clarify（本ドキュメント + questions.md）
- [x] 上流成果物の読込（requirements / functional-design 7 成果物 / RE technology-stack・architecture / 上流レビュー）
- [x] 設計委譲事項の抽出（OQ-1〜OQ-3 + 本ステージ管轄の tech stack 選定）→ questions.md（Q1〜Q7）作成
- [x] plan.md（本ファイル）作成、state.json を `clarification-asked` へ更新

### Step 2 — 回答の反映と設計パラメータ確定
- [x] questions.md の回答（Q1〜Q7）を読み、曖昧なら follow-up を追記（`further-clarification`）→ 全問 a 採択・曖昧さなし、follow-up 不要と判断（2026-06-10）
- [x] 確定した決定を設計パラメータ表（決定 ID 付き）として整理し、本 plan を必要に応じて改訂 → 下表 D-1〜D-7。plan の Steps 構成に変更なし

#### 設計パラメータ（確定 — questions.md 回答より）

| 決定 ID | 出典 | 決定内容 |
|---|---|---|
| D-1 | Q1=a | BR-013 ローカル経路 = **ヘッダ注入方式**。dev 専用値をリポジトリにコミットし（`local-dev-only` 等の自明な値）、検証ミドルウェアは常時有効・本番と同一コードパス。RF-16 受入基準「ヘッダ値はハードコードされない」は「**本番**ヘッダ値は」と解釈（nfr-specification.md Constraints に明文化） |
| D-2 | Q2=a | 本番ヘッダ値 = **Secrets Manager 自動生成**。CloudFront オリジンカスタムヘッダと API 側検証の両方へ CloudFormation 動的参照で注入。リポジトリ・synth テンプレートとも平文なし（約 +$0.40/月）。具体 construct は infrastructure-design へ |
| D-3 | Q3=a | CI の `pnpm audit` は **`--audit-level=high`**。修正不能 advisory は `auditConfig.ignoreCves`（理由コメント付き）で個別 ignore、Renovate（RF-19）解消時に削除する運用 |
| D-4 | Q4=a | NFR-001 の正式計測点 = **Lambda Duration p95**。主アラーム = Duration p95 > 500ms（period 5 分、3/3 datapoints、missing=notBreaching）+ 補助 = API GW Latency p99 > 1500ms（コールドスタート込み経路の異常検知役） |
| D-5 | Q5=a | アラーム通知 = **SNS トピックのみ CDK で作成しアクション接続**。購読（メール等）は手動・README に 1 行追記（個人情報をリポジトリに載せない） |
| D-6 | Q6=a | 構造化ログ = **AWS Lambda Powertools for TypeScript（Logger）**。必須フィールド: method / path / status / requestId、エラー時 stack。Hono ミドルウェア接続は code-generation |
| D-7 | Q7=a | E2E = **Playwright（@playwright/test）**。BT-1〜BT-5 の 1 周 + BT-7（health 200）の小スイート、docker-compose（A-7）上で実行 |

### Step 3 — `nfr-specification.md` 作成（テンプレート準拠）
- [x] Quality Targets: NFR-001〜007 を「計測可能なターゲット + 計測方法 + 根拠 + 出典」へ展開（QT-1〜QT-9。NFR-001 の計測点 = Lambda Duration p95 を D-4 で確定。フロント初回ロード 3 秒は対象外 — OOS-9 — を QT-1 rationale に明記）
- [x] Tech Stack: 構造化ログ（D-6）/ E2E（D-7）/ CI = GitHub Actions（A-4 確定）/ Secret 管理（D-2）/ 通知（D-5）/ Renovate / RF-18 確定済みバージョン到達点（Vitest 3 / Vite 7 / Biome 2 / CDK 現行固定）を「選定理由 + 対応 QT + 不採用代替」付きで記録
- [x] Patterns: 条件付き書込 / オリジン検証ヘッダ + dev ヘッダ注入 + Secret 自動生成（D-1/D-2）/ 構造化ログ + スタック出力 / アラーム 4 種 + SNS（D-4/D-5）/ CI 検証ゲート（D-3）/ E2E スモーク（D-7）の 8 パターンを「Satisfies / Applied to / trade-off / failure mode」で表化
- [x] Blueprint Annotations / API Quality Annotations（API-001〜006: レイテンシ目標・タイムアウト・リトライ/冪等性・logs/metrics）/ Component Quality Annotations（CMP-001〜003: データ分類・resiliency・scaling・security controls）
- [x] Trade-offs（6 件）と Constraints（C-1〜C-9）を明文化。F-2/F-3 への対応欄と RF 非機能側トレーサビリティ表を追加

### Step 4 — `components.yaml` copy-forward 拡張
- [x] functional-design 版を本ステージへコピーし、CMP-001/002/003 へ `NFR-Annotations` ブロック（quality targets / data classification / resiliency / observability / scalability / security）のみ追記。CMP Id・Name・境界・依存・Entities・Functional-Design-References は不変（blueprint identity 維持、ヘッダに追記注記）→ diff で削除 0 行・追加のみを確認、YAML 3 ドキュメントのパース検証済み

### Step 5 — `unit.md` copy-forward 拡張
- [x] functional-design 版をコピーし、「NFR posture / 技術選定 / 運用制約」の節を追記（原本節は不変）。申し送り #3/#4/#6 の解決を末尾の新節で記録（functional-design 版の表自体は不変のまま保存 — copy-forward 原本の改変を避けるため新節方式を採用） or infrastructure-design へ残余委譲を明記

### Step 6 — `api-specification.md` copy-forward 拡張
- [x] functional-design 版をコピーし、API-001〜006 へ NFR 注釈（レイテンシ目標・タイムアウト・リトライ/冪等性・observability 要件 — 単一実行基盤のため共通規定 + API 別差分の 2 表構成）を追記。OQ-1〜OQ-3 の解決状況を末尾の新節で記録（本ステージ決定分 D-1〜D-5 を記入し、infrastructure-design / code-generation への残余を明示）。既存の操作仕様・Versioning・通信前提・Open Questions 原本は不変

### Step 7 — 整合確認と完了処理
- [x] BR-012/BR-013 と nfr-specification.md の間に二重定義・矛盾がないことを確認（F-2/F-3 の処置を nfr-specification.md「上流申し送りへの対応」節に明記 — BR-012 = 500 非開示の機能規則として参照のみ / BR-013 の「構成物に平文で保持しない」は D-2 で字句充足・dev 値は C-5 で解釈確定）
- [x] RF ↔ NFR ↔ 成果物のトレーサビリティを点検（nfr-specification.md「トレーサビリティ」表 — RF-01/02/10/11/14/15/16/18/19 の非機能側が QT / Tech Stack / Patterns / Constraints のいずれかに全件着地。RF-20/21 の本ステージ関与分も記録）。copy-forward 3 ファイルの blueprint identity を diff で検証（components.yaml: 削除 0 行 / unit.md: 削除 0 行 / api-specification.md: タイトル行の stage 表記のみ変更）
- [x] state.json の本ステージ outputs に全成果物（questions.md / plan.md / nfr-specification.md / components.yaml / unit.md / api-specification.md）を登録し、status を `artifact-generated` へ更新
