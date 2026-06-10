# NFR Specification — nfr-design / unit: todo-app (UNIT-001)

> Stage: nfr-design / Owner: aidlc-systems-architect-agent / 2026-06-10
> 入力: requirements.md（NFR-001〜007 / RF の非機能側 / BP-1 / A / OOS）、functional-design 7 成果物、
> RE technology-stack.md・architecture.md（既存基盤制約）、functional-design 最終レビュー（F-2/F-3 申し送り）。
> 決定の反映: questions.md Q1〜Q7（全問 a — plan.md の設計パラメータ表 D-1〜D-7）。
> ID 規約: 品質ターゲットは **QT-n** 系列（requirements の NFR-00n と衝突させないためのステージローカル ID。
> Source 列で NFR-00n / RF-xx へ遡及する）。
> 本ステージは技術選定が管轄のため、本書のみ技術固有名を正式に使用する（functional-design 成果物の
> technology-agnostic 規律とは役割が異なる）。

## Quality Targets

| ID | Attribute | Target | Measure | Rationale | Source |
|---|---|---|---|---|---|
| QT-1 | performance | API 応答 500ms 以内（コールドスタート除く）: **Lambda Duration p95 ≤ 500ms** | CloudWatch `AWS/Lambda` Duration p95。主アラーム閾値 > 500ms、period 5 分、3/3 datapoints、missing data = notBreaching（D-4） | Lambda Duration メトリクスは Init フェーズ（コールドスタート初期化）を含まないため、「コールドスタート除く」を**メトリクス定義そのもの**で満たす。p95 は低トラフィック（デモ）での統計の荒れを 5 分 × 3 連続 + notBreaching で平滑化。フロント初回ロード 3 秒は本 intent では計測対象外（OOS-9 — RUM 不導入） | NFR-001 / RF-15 |
| QT-2 | performance（補助） | 経路全体（API GW 視点）の異常検知: **API GW Latency p99 ≤ 1500ms** | CloudWatch `AWS/ApiGateway` Latency p99。補助アラーム閾値 > 1500ms、period 5 分、3/3 datapoints、missing = notBreaching（D-4） | API GW Latency は Init 込みの経路全体値のため、500ms に張ると低トラフィックではコールドスタート踏襲リクエストだけで構造的に誤報する（RF-15 受入基準が回避を要求）。閾値を緩めて「経路全体の異常検知」と役割分担する。500ms との整合根拠 = 本行（RF-15 受入基準の文書化要求に対応） | NFR-001 / RF-15 |
| QT-3 | availability | AWS マネージドサービスの SLA に準拠（追加の可用性設計なし） | 構成レビュー: 全コンポーネントがマネージドサービス（Lambda / API GW / DynamoDB / S3 / CloudFront）であること。infrastructure テストの構成 assert で担保 | デモ用途・単一環境（A-5）。マルチ AZ はマネージドサービスの既定で享受し、追加設計はしない | NFR-002 |
| QT-4 | security | 意図経路の強制: 意図経路の証明なしの直接アクセスは全操作で 403。**本番ヘッダ値の平文がリポジトリ・synth テンプレートに 0 件** | 検証ミドルウェアの unit テスト（一致 / 不一致 / 欠落）+ E2E BT-7（誤拒否の回帰検知 — RF-02）+ infrastructure テスト（Secret が動的参照で注入されること = テンプレートに平文がないこと） | BR-013（強制点 = CMP-002）。ローカル経路はヘッダ注入（D-1）で検証ロジック込みの同一コードパス、本番値は Secrets Manager 自動生成 + 動的参照（D-2）で BR-013 の「構成物に平文で保持しない」を字句どおり満たす | NFR-003 / RF-16 |
| QT-5 | security | IAM 最小権限: Lambda 実行ロールの DynamoDB 権限 = **GetItem / PutItem / UpdateItem / DeleteItem / Scan の 5 アクションのみ** | synth テンプレートの IAM ポリシーを infrastructure テストで assert（RF-14 受入基準）。全 BT の動作は既存テスト + E2E で確認 | v1 設計（infrastructure-design §6）への回帰（ドリフト解消 — Q1=c）。条件付き書込（BR-007）は UpdateItem / DeleteItem の ConditionExpression で実現でき、追加アクション不要 | NFR-003 / RF-14 |
| QT-6 | observability | 主要なエラーとレイテンシ異常が人手のログ確認なしに検知できる: **アラーム 4 種 + SNS 通知到達**、リクエストログの **JSON パース可能率 100%** | synth テンプレートに 4 アラーム（Lambda Errors / Duration、API GW 5xx / Latency）と SNS トピック + アラームアクションが存在することを infrastructure テストで assert（RF-15）。ログ出力は unit テストで JSON パース + 必須フィールド（method / path / status / requestId、エラー時 stack）を assert（RF-10/11） | NFR-005 の「人手のログ確認なしに検知」を、検知（アラーム）と通知（SNS）と調査可能性（構造化ログ + stack）の 3 点で充足する。エラー詳細のクライアント非開示（500 固定ボディ）は BR-012 で確定済み — 本書は重複定義しない（F-2 対応） | NFR-005 / RF-10/11/15 |
| QT-7 | continuous verification | main に入るすべての変更が CI ゲートを通過: **lint / typecheck / test / cdk synth / pnpm audit / E2E の 6 種が全 workspace 対象で実行され、いずれかの失敗で fail** | GitHub Actions workflow の存在 + 6 ジョブ定義（RF-01/02 受入基準）。typecheck / test の対象に `@todo-ai-dlc/shared` を含む全 4 パッケージ。main への変更が CI を経由する運用を README に明記 | NFR-006。P0（検証ゲート）が他のすべての変更の前提という要件の優先順位（Q4=c）をそのまま品質ターゲット化 | NFR-004 / NFR-006 / RF-01/02 |
| QT-8 | dependency health | 既知脆弱性と依存陳腐化の継続検知: **high 以上の CVE 0 件で main を維持**、依存更新 PR の自動生成が構成済み | CI の `pnpm audit --audit-level=high`（D-3）。Renovate 設定ファイルの存在 + グループ化構成（RF-19 受入基準） | high 閾値は「実害可能性の高い脆弱性を確実に止める」と「moderate 起因の恒常 fail → CI 無視の習慣化回避」のバランス点。修正不能 advisory の扱いは Constraints C-6 | NFR-007 / RF-01/19 |
| QT-9 | reliability | 更新・削除の存在判定と書込のアトミック性: **TOCTOU 競合による upsert 経路 0、DynamoDB 呼出 各操作 1 回** | unit テスト（存在しない id への PUT が新規作成せず 404 / 複合ケース 400）+ 実装で update / delete の DynamoDB 呼出が各 1 回（RF-07 受入基準） | 機能規則としては BR-007/BR-009 で確定済み。本書は信頼性ターゲットとしての計測面（呼出回数・競合経路の排除）のみを規定する | BP-1 / RF-07 / NFR-002 |

> 省略事項: フロント初回ロード 3 秒（NFR-001 後半）は計測対象外（OOS-9）のため QT を立てない（QT-1 の Rationale に記録）。

## Tech Stack

> 既存スタック（Node.js 20 / Hono 4 / React 19 / DynamoDB / CDK — BP-1 で変更要件なし）は前提として継承し、
> 本表は**本ステージで選定・確定した差分**と RF-18 のバージョン到達点のみを記録する。

| Layer | Choice | Rationale | Alternatives Considered |
|---|---|---|---|
| 構造化ログ | **AWS Lambda Powertools for TypeScript（`@aws-lambda-powertools/logger`）**（D-6 / Q6=a） | QT-6（RF-10/11）。Lambda コンテキスト自動付与・ログレベル・child logger を標準装備。教材として AWS 公式ベストプラクティスを提示でき（AR-P6 の趣旨）、将来の Metrics / Tracer 拡張（OOS-9 の将来 intent）が同一ライブラリ路線。esbuild バンドルで実質サイズ増は小。Renovate（RF-19）管理下に入る | 軽量自前 JSON ロガー（依存ゼロだが自前保守対象が増え、教材として車輪の再発明）/ pino（Lambda コンテキスト付与が自前実装になり、標準性で劣る） |
| E2E テスト | **Playwright（`@playwright/test`）**（D-7 / Q7=a） | QT-7（RF-02）。GitHub Actions（A-4）公式サポート・自動待機・トレース取得が標準。docker-compose 起動（A-7）と素直に組み合い、既存 data-testid をそのまま locator に使える。テストランナーは Vitest と分離（責務が異なり衝突しない）。依存は devDependencies に閉じる | Cypress（実行が遅く CI コンテナでの安定運用に追加設定が多い。この規模で優位点なし） |
| CI | **GitHub Actions**（A-4 — 確定済み前提） | QT-7（RF-01）。リポジトリが GitHub ホスト。lint / typecheck / test / `cdk synth` / `pnpm audit --audit-level=high` / E2E の 6 ジョブ構成 | （A-4 で確定済みのため代替検討なし。`.aidlc-workflows/.github` は vendored であり流用しない） |
| Secret 管理 | **AWS Secrets Manager（自動生成 + CloudFormation 動的参照）**（D-2 / Q2=a） | QT-4（RF-16）。IaC が Secret を自動生成し、CloudFront オリジンカスタムヘッダと API 側検証の両方へ動的参照で注入。手動ステップゼロで RF-20（1 コマンドデプロイ）と整合。BR-013「構成物に平文で保持しない」を字句どおり満たす唯一の選択肢。約 +$0.40/月 | SSM Parameter Store（無料だが SecureString の CDK 自動生成に難があり手動投入が必要 — RF-20 と緊張）/ デプロイ時パラメータ渡し（synth テンプレート・Lambda 環境変数に平文が載る） |
| アラーム通知 | **Amazon SNS（トピックのみ CDK 作成 + アラームアクション接続。購読は手動）**（D-5 / Q5=a） | QT-6（RF-15）。「鳴っても誰にも届かない」状態を構造的に回避しつつ、個人メールアドレスをリポジトリに載せない。無料枠内でコスト影響なし。購読手順は README に 1 行追記（RF-20 のデプロイ手順と同居） | アクションなし（NFR-005「人手のログ確認なしに検知」に対して弱い）/ 購読メールの CDK パラメータ化（個人情報が構成に載り教材リポジトリと相性が悪い） |
| 依存自動更新 | **Renovate（グループ化設定付き）**（RF-19） | QT-8。minor/patch のグループ化で PR ノイズを抑制。CI の `pnpm audit`（D-3）と連動し、ignoreCves エントリの解消を担う | Dependabot（要件上は許容だが、グループ化・pnpm workspace 対応の柔軟性で Renovate を採る） |
| テストランナー / ビルド / lint | **Vitest 3 / Vite 7 / Biome 2**（RF-18 到達点 — 確定済み前提） | QT-7 / NFR-004。教材の鮮度維持。P0 検証ゲート確立後に安全に更新。Vite 7 の Node エンジン要件（^20.19 / >=22.12）に対する `node:20-slim` 適合確認を移行手順に含める（Constraints C-7） | （RF-18 で確定済み。zod v4 は OOS-6 で明示的に非移行） |
| IaC | **AWS CDK 現行版・完全固定宣言を維持**（RF-18 / SECURITY-10） | QT-3/QT-5/QT-6 の実現基盤。CLI と lib のバージョン体系分離（CLI 2.1000 系）に追随しつつ固定方針（SECURITY-10）は不変。deprecated プロパティ移行（RF-17）は infrastructure-design / code-generation で実施 | （固定 vs caret の方針変更は検討対象外 — SECURITY-10 維持が要件） |

## Patterns

| Pattern | Satisfies | Applied to | How it works | Trade-off | Failure mode |
|---|---|---|---|---|---|
| 条件付き書込（conditional write） | QT-9 | CMP-002 / API-004, API-005 | `ConditionExpression: attribute_exists(id)` で存在判定と書込を単一のアトミック操作に統合（BR-007）。404 判定は条件失敗例外のハンドリングへ移る | 処理順序が「検証 → 書込」に反転し、複合ケースの応答が 400 優先に変わる（BR-009 — BP-1 許容変更 4 で承認済み）。例外ベースの 404 判定はコードがやや非直感的 | 条件評価失敗 → 404（正常系の一部）。DynamoDB 障害 → 500 + 構造化ログに stack（BR-012） |
| オリジン検証ヘッダ（origin verification header） | QT-4 | CMP-002 全 API（API-001〜006）/ UNIT-001（IaC 側 = ヘッダ付与） | CloudFront がオリジンへカスタムヘッダを付与し、API 側ミドルウェアが一致を検証、不一致・欠落は 403（BR-013）。検証ミドルウェアは常時有効（フェイルオープン経路なし — D-1） | WAF（OOS-2）より低コストだが防御は単一ヘッダの共有秘密に依存（デモ用途に見合う水準）。ローテーション時は CloudFront / Lambda 両方への再配布が必要（デモでは不要） | Secret 設定不整合 → 全リクエスト 403。本番は API-006 の監視で、ローカル/CI は E2E BT-7（health 200）で即検知（RF-02） |
| dev ヘッダ注入（ローカル経路） | QT-4 / QT-7 | docker-compose / Vite proxy / Playwright 設定（UNIT-001 開発基盤） | リポジトリにコミットする dev 専用値（`local-dev-only` 等の自明な値）をローカル構成が注入し、検証ミドルウェアを常時有効のまま本番と同一コードパスを通す（D-1） | dev 値がリポジトリに載る（本番値とは独立 — Constraints C-5 で解釈を確定）。ローカル構成 3 箇所（compose / proxy / E2E）に注入設定が増える | dev 値の注入漏れ → ローカル全 403 → E2E が即 fail（発見容易・フェイルクローズ）。「ミドルウェア変更による意図しない 403 化」は E2E BT-7 が回帰検知器として機能する |
| Secret 自動生成 + 動的参照 | QT-4 | UNIT-001（IaC — 具体 construct は infrastructure-design） | Secrets Manager が本番ヘッダ値を自動生成し、CloudFront オリジンカスタムヘッダと Lambda 環境へ CloudFormation 動的参照で注入。リポジトリ・synth テンプレートに平文が現れない（D-2） | 約 +$0.40/月（WAF 月額 $5〜 とはコスト桁が異なる）。動的参照の解決はデプロイ時のため、Secret 削除時の失敗はデプロイ時に顕在化 | Secret 参照切れ → デプロイ失敗（実行時ではなくデプロイ時に検知 — フェイルファスト）。infrastructure テストが動的参照の存在を assert |
| 構造化ログ + エラー stack 出力 | QT-6 | CMP-002（接続実装は code-generation） | Powertools Logger が JSON ログを出力（必須フィールド: method / path / status / requestId、エラー時 stack — D-6）。Lambda コンテキスト（requestId 等）は自動付与。SECURITY-03 コメントと実態のドリフト（AR-O4）を解消 | 依存 1 系統追加（Renovate 管理下）。hono/logger（プレーンテキスト）からの置換が必要 | ログ出力の失敗はリクエスト処理に影響させない（ロガーはベストエフォート）。JSON 形式の崩れは unit テストのパース assert で検知 |
| アラーム 4 種 + SNS 通知 | QT-1 / QT-2 / QT-6 | UNIT-001（IaC — 具体リソースは infrastructure-design） | ①Lambda Duration p95 > 500ms（主 — D-4）②API GW Latency p99 > 1500ms（補助）③Lambda Errors Sum ≥ 1 ④API GW 5xx Sum ≥ 1。いずれも period 5 分・missing = notBreaching、レイテンシ系は 3/3 datapoints、エラー系は 1/1。全アラームのアクション = SNS トピック（D-5） | p95/p99 は低トラフィックで統計が荒れる（5 分 × 3 連続 + notBreaching で平滑化）。エラー系の 1 件即報はデモでは妥当だが本番運用ならレート化が必要。購読 1 ステップが手動に残る | アラーム自体の構成漏れは infrastructure テストの assert で検知。SNS 未購読時は通知が届かない（アラーム状態は CloudWatch に残る。README の購読手順 1 行で緩和 — D-5） |
| CI 検証ゲート | QT-7 / QT-8 | UNIT-001（GitHub Actions） | PR/push で lint（biome check）/ typecheck（全 workspace `tsc --noEmit`）/ test（全 workspace `vitest run`）/ `cdk synth` / `pnpm audit --audit-level=high`（D-3）/ E2E の 6 種を実行し、いずれかの失敗で fail（RF-01/02） | CI 実行時間の増加（E2E 含む）。audit high 閾値は moderate を素通しする（恒常 fail → CI 無視の習慣化の回避を優先 — D-3） | CI 基盤自体の障害時はマージ凍結（運用判断）。修正不能 advisory による恒常 fail は ignoreCves 運用（C-6）で解消 |
| E2E スモーク（Playwright on docker-compose） | QT-7 / BP-1 | UNIT-001 / API-001〜006（消費面） | BT-1〜BT-5 の 1 周（作成→一覧→編集→トグル→削除）+ BT-7（health 200）を docker-compose 環境（A-7）の実ブラウザで検証（D-7）。BR-013 検証ロジック込みのコードパスを通す（D-1 とセット） | スイートを意図的に薄く保つ（網羅は unit 45 件と分担 — モック境界で捕捉不能な統合不具合に限定）。AWS 実環境への E2E は対象外（A-7） | 環境起動失敗とテスト失敗を区別するためセットアップステップを分離。失敗時は Playwright トレースで調査 |

## Blueprint Annotations

| Blueprint ID | Type | NFRs Applied | Required Expansion |
|---|---|---|---|
| CMP-001 | component | QT-6（ユーザー面）/ QT-7 | components.yaml（本ステージ版）に NFR-Annotations を追記: データ分類・エラー表示の resiliency（BR-011 参照）・CDN 配信のスケーリング・CSP 維持・E2E/CI 対象 |
| CMP-002 | component | QT-1 / QT-4 / QT-5 / QT-6 / QT-9 | components.yaml（本ステージ版）に NFR-Annotations を追記: レイテンシ目標・オリジン検証・構造化ログ（Powertools）・条件付き書込・IAM 5 アクション・ステートレススケーリング |
| CMP-003 | component | QT-7 / QT-8 | components.yaml（本ステージ版）に NFR-Annotations を追記: 定義専用（runtime なし）・CI の typecheck/test 対象・secrets 持込禁止 |
| API-001〜API-006 | API | QT-1 / QT-2 / QT-4 / QT-6 | api-specification.md（本ステージ版）に NFR Annotations 節を追記: レイテンシ目標・タイムアウト・リトライ/冪等性・observability 要件 + OQ-1〜3 の解決状況更新 |
| UNIT-001 | unit | 全 QT | unit.md（本ステージ版）に NFR posture / 技術選定 / 運用制約の節を追記 + 申し送り #3/#4/#6 の解決を記録 |

## API Quality Annotations

> 単一 Lambda が全 API を処理するため、レイテンシ目標は API 別に分割せず unit 共通で QT-1（Lambda Duration p95 ≤ 500ms）を適用する。
> タイムアウトは既存実行基盤の所与値（BP-1 — Lambda 30s / API GW HTTP API 統合 30s）。クライアント側タイムアウトは未設定（現状維持 — ブラウザ既定）。
> レート制限は API GW アカウント既定スロットリングのみ（WAF は OOS-2、個別スロットリング設定は要件なし）。

| API ID | Limit / Target | Timeout | Retry / Idempotency | Observability |
|---|---|---|---|---|
| API-001（POST /api/todos） | レイテンシ = QT-1。ペイロード上限は BR-001/002（title ≤ 200 / description ≤ 1000）で実質制約 | Lambda/統合 30s（BP-1） | **非冪等**（呼ぶたび新規 ULID）。自動リトライしない — 失敗は BR-011 でユーザー可視化し人間が再操作 | 構造化ログ（method/path/status/requestId — D-6）。400 はクライアント起因としてアラーム対象外（BR-008 が 500 から分離 — RF-04 の効果）。5xx / Duration はアラーム対象 |
| API-002（GET /api/todos） | レイテンシ = QT-1。応答は全件（ページネーションなし — OOS-5。デモ規模で許容） | 同上 | **安全・冪等** — リトライ可（クライアント自動リトライは未実装・現状維持） | 同上（構造化ログ + 5xx/Duration アラーム） |
| API-003（GET /api/todos/:id） | レイテンシ = QT-1 | 同上 | **安全・冪等** | 同上 |
| API-004（PUT /api/todos/:id） | レイテンシ = QT-1。ペイロード上限は BR-001/002 | 同上 | **冪等**（同一入力の再送はリソース状態を変えない — updatedAt のみ再更新、BR-005/006）。自動リトライしない — 失敗は BR-011 | 同上 |
| API-005（DELETE /api/todos/:id） | レイテンシ = QT-1 | 同上 | **効果として冪等**（2 回目は 404 — BR-007。副作用は再発しない）。自動リトライしない — 失敗は BR-011 | 同上 |
| API-006（GET /api/health） | レイテンシ = QT-1。監視・E2E が任意頻度で呼出可（エンティティに触れず負荷影響なし） | 同上 | **安全・冪等** | 誤 403 化の回帰は E2E BT-7 アサーションで検知（RF-02 / BR-013 violation 欄）。5xx アラーム対象 |

> 全 API 共通: 意図経路検証（BR-013 — QT-4）が前段に適用される。403 はクライアント起因としてエラーアラームの対象外（Lambda Errors は未処理例外のみを数える）。

## Component Quality Annotations

| Component ID | Data Classification | Resiliency Need | Scaling Need | Security Controls |
|---|---|---|---|---|
| CMP-001 | **public** — 認証なしデモ・PII なし（単一共有リスト — A-2）。表示データは全利用者共通 | ミューテーション失敗のユーザー可視化（BR-011 — 無言の握り潰し禁止）。一覧取得失敗は既存エラー状態表示を維持。自動リトライは導入しない | CloudFront（CDN）による静的配信スケール — 追加設計不要 | CloudFront セキュリティヘッダ / CSP `connect-src 'self'`（既存維持 — AR-O10）。secrets を一切保持しない |
| CMP-002 | **public 相当**（PII なし）。ただし書込面は意図経路強制（QT-4）で保護し、無差別な直接書込を遮断する | ステートレス Lambda（リトライ安全性は API 別に上表で規定）。条件付き書込で TOCTOU 排除（QT-9）。未処理例外は 500 + 構造化ログに stack（BR-012 + D-6）で degrade | Lambda 同時実行の自動スケール + DynamoDB オンデマンド（BP-1 — 変更なし。デモ負荷で制約なし。256MB/30s も据置） | オリジン検証ミドルウェア（BR-013 / D-1/D-2）・zod 境界検証（CMP-003 schema — BR-014）・IAM 5 アクション限定（QT-5）・エラー非開示（BR-012）・本番 Secret は動的参照のみ（QT-4） |
| CMP-003 | **public** — 公開リポジトリのソースコード（型・schema・定数のみ） | runtime なし — 該当なし（定義専用） | 該当なし | secrets・環境依存値の持込禁止（定義専用パッケージの規律）。CI の typecheck/test 対象に含め型乖離を構造的に防止（QT-7 / RF-03） |

## Trade-offs

| Prioritised | Over | Decision | Rationale |
|---|---|---|---|
| 教材価値（AWS 標準実装の提示） | 依存最小 | Powertools Logger 採用（D-6） | 自前ロガーの保守対象化を避け、「AWS 標準の観測性実装例」を示すこと自体に教材価値がある（AR-P6 の趣旨）。将来の Metrics/Tracer 拡張も同一路線 |
| 誤報回避（アラームの信頼性） | 検知感度 | API GW Latency は p99 / 1500ms に緩和（D-4） | コールドスタート込みメトリクスに 500ms を張ると低トラフィックで構造的誤報 → アラーム無視の習慣化が最悪の結果。NFR-001 の正式計測点を Lambda Duration p95 に定義して感度は主アラームで確保 |
| 本番同一コードパス（フェイルクローズ） | ローカル構成の単純さ | ヘッダ注入方式（D-1） | E2E が BR-013 検証ロジック込みで全 BT + BT-7 を回り、「意図しない 403 化」の回帰検知器として機能する。フェイルオープン経路（Secret 未設定でスキップ）を残さない |
| Secret 非可視性（BR-013 字句充足） | コストゼロ | Secrets Manager 自動生成 +$0.40/月（D-2） | WAF 除外判断（OOS-2 — 月額 $5〜）とはコスト桁が異なる。手動ステップゼロで RF-20（1 コマンドデプロイ）と整合し、「オリジン検証ヘッダの正しい管理」を教材として示せる |
| CI の持続可能性 | 最大厳格性 | audit `--audit-level=high` + ignoreCves 運用（D-3） | moderate 閾値はデモ規模でも恒常 fail を招きやすく、「CI が常に赤」はゲートの死を意味する。high/critical を確実に止める方を優先 |
| 通知の到達性 | 通知の完全自動化 | SNS トピックのみ CDK・購読手動（D-5） | 個人メールアドレスをリポジトリ・CDK パラメータに載せない（教材リポジトリの性格）。手動は購読 1 ステップのみで README に明記 |

## Constraints

| Constraint | Impact | Source |
|---|---|---|
| C-1: 既存実行基盤の据置（Lambda Node.js 20 / 256MB / 30s、DynamoDB オンデマンド + PITR、CloudWatch Logs 保持 90 日、単一スタック構成） | 実行基盤の変更要件なし（BP-1）。本ステージの追加はアラーム・SNS・Secret 参照のみで、性能チューニング（メモリ増等）は QT-1 違反が観測されてから検討する | BP-1 / RE technology-stack.md・architecture.md |
| C-2: CDK 完全固定方針（SECURITY-10） | RF-18 はバージョンのみ現行へ更新し固定宣言を維持。CLI（2.1000 系）と lib の体系分離に追随 | requirements RF-18 |
| C-3: GitHub Actions（A-4）/ docker-compose ローカル E2E（A-7） | CI・E2E の基盤が確定済み — 本ステージはジョブ構成とフレームワーク（Playwright）のみ決定 | requirements A-4 / A-7 |
| C-4: 単一環境・`TodoTable` 固定名（A-5 / OOS-8） | アラーム・トピック等の命名も単一環境前提でよい。複数環境対応の抽象化は行わない | requirements A-5 |
| C-5: **dev 専用ヘッダ値はリポジトリにコミットする（D-1 の帰結）**。RF-16 受入基準「ヘッダ値はハードコードされない」は「**本番**ヘッダ値はハードコードされない」と解釈する | dev 値は `local-dev-only` 等、本番に流用し得ないことが自明な値とし、本番値（Secrets Manager 自動生成 — D-2）とは完全に独立。確定済み保護目標「リポジトリへの**本番値**平文コミット防止」に抵触しない。BR-013 の「構成物に平文で保持しない」は本番値について D-2 が字句どおり充足（F-3 の字句緊張はこの 2 文で解消） | Q1=a / RF-16 / functional-design レビュー F-3 |
| C-6: 修正不能な上流 advisory への対処は pnpm `auditConfig.ignoreCves`（package.json）で**理由コメント付き**個別 ignore とし、Renovate の更新で解消され次第削除する | CI 恒常 fail の回避と「ignore の放置」防止を両立。ignore エントリは Renovate PR レビュー時の確認対象 | D-3（Q3=a） |
| C-7: Vite 7 の Node エンジン要件（^20.19 / >=22.12） | `node:20-slim` ベースイメージの適合確認（>= 20.19 であること）を RF-18 移行手順に含める。不適合なら 20 系最新へのイメージ更新で対処（メジャーは変えない — BP-1） | requirements RF-18 |
| C-8: スコープ除外 — WAF（OOS-2）・X-Ray/ダッシュボード/RUM（OOS-9）・zod v4（OOS-6）・認証認可（OOS-1） | 経路防御は BR-013 + API GW 既定スロットリングまで。観測性はログ + アラーム + SNS まで。検証ライブラリは zod 3 系を維持 | requirements OOS |
| C-9: pnpm monorepo（packageManager 固定・corepack） | 新依存（Powertools / Playwright / Renovate 設定）は workspace 規律に従い、すべて Renovate 管理下に置く | RE technology-stack.md |

## 上流申し送りへの対応（functional-design レビュー F-2 / F-3）

| 申し送り | 本書での処置 |
|---|---|
| F-2: RF-11 の「機能面 / 非機能面」ラベル揺れ — nfr-design が RF-11 全体を管轄と誤読し BR-012 と二重定義する懸念 | **分担を明記**: 500 の非開示（固定ボディ）= BR-012 で確定済みの機能規則 — 本書は再定義しない。スタックのサーバー側ログ出力 = 本書 QT-6 / 構造化ログパターン（D-6）の管轄。強制点の単一性（BR-014 の思想）を維持 |
| F-3: BR-013 logic の「構成物に平文で保持しない」が OQ-1 の決定を先取りして見える字句緊張 | **D-2 で解消**: Secrets Manager 自動生成 + 動的参照により、本番値はリポジトリ・synth テンプレートのいずれにも平文で現れず、BR-013 の字句をそのまま満たす。dev 値の扱いは C-5 で「本番値とは独立」と確定 |

## トレーサビリティ（RF 非機能側の着地確認）

| RF | 着地（本ステージ） | 残余の委譲先 |
|---|---|---|
| RF-01 | QT-7 / Tech Stack（GitHub Actions）/ CI 検証ゲートパターン / D-3（audit 閾値） | workflow 実装 = code-generation |
| RF-02 | QT-7 / Tech Stack（Playwright — D-7）/ E2E スモークパターン | テスト実装 = code-generation |
| RF-10 / RF-11 | QT-6 / Tech Stack（Powertools Logger — D-6）/ 構造化ログパターン（BR-012 との分担は F-2 対応欄） | ミドルウェア接続実装 = code-generation |
| RF-14 | QT-5 / CMP-002 Security Controls | IAM ポリシー定義 = infrastructure-design |
| RF-15 | QT-1 / QT-2 / QT-6 / アラーム + SNS パターン（D-4 / D-5） | アラームリソース定義 = infrastructure-design |
| RF-16 | QT-4 / オリジン検証 + dev ヘッダ注入 + Secret 自動生成パターン（D-1 / D-2）/ C-5 | construct 構成（CloudFront ヘッダ付与・Secret 注入）= infrastructure-design、検証ミドルウェア実装 = code-generation |
| RF-18 | Tech Stack（Vitest 3 / Vite 7 / Biome 2 / CDK 現行固定）/ C-2 / C-7 | 移行実施 = code-generation（RF-17 の deprecated 移行は infrastructure-design 設計 + code-generation 実施） |
| RF-19 | QT-8 / Tech Stack（Renovate） | 設定ファイル実装 = code-generation |
| RF-20 / RF-21 | D-2 が RF-20（1 コマンドデプロイ）との整合を制約として考慮（手動ステップを増やさない）。README 追記 1 行（SNS 購読 — D-5）を RF-20 手順に同居 | スクリプト・Dockerfile 改修 = code-generation |
