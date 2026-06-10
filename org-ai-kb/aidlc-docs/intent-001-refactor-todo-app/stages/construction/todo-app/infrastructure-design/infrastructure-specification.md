# Infrastructure Specification — infrastructure-design / unit: todo-app (UNIT-001)

> Stage: infrastructure-design / Owner: aidlc-systems-architect-agent / 2026-06-10
> 入力: nfr-specification.md（QT-1〜9 / D-1〜D-7 / C-1〜C-9 — 本書の正）、nfr-design 版 components.yaml / unit.md
> （copy-forward 元）、functional-design rules.yaml（BR-013）/ api-specification.md、units-generation
> unit-dependencies.md（DEP-O1/O2）、RE architecture.md（AR-O1〜O10）、実コード
> `packages/infrastructure/lib/todo-stack.ts`（現行 TodoStack — 行参照は本書執筆時点）。
> 決定の反映: questions.md Q1=a（`ApiUrl` CfnOutput 維持 + 説明文更新）/ Q2=a（旧 Lambda ロググループ残置許容・注記のみ）。
> 役割: nfr-design の論理設計を実際の AWS リソース構成・construct 設計へ翻訳する。CDK コード変更・
> テスト実装・検証ミドルウェア実装は code-generation へ委譲（委譲先は各節に明記）。

## Service Mapping

> brownfield（BP-1 / C-1）: 既存リソースは**据置**が原則。本ステージの新規はオリジン検証（QT-4）と
> 観測性（QT-6）に必要な 4 区分のみ。

| Blueprint ID | Logical Component | Service | Provider | Rationale | NFR Satisfied |
|---|---|---|---|---|---|
| CMP-001 | Todo Frontend（SPA） | S3（FrontendBucket — 非公開 / SSE-S3）+ CloudFront Distribution + BucketDeployment | AWS | 既存据置（C-1）。静的配信は CDN で自動スケール、追加設計なし | QT-3 / QT-6（ユーザー面は UI 側） |
| CMP-002 | Todo Backend API | API Gateway HTTP API（TodoApi）+ Lambda NodejsFunction（TodoApiFunction）+ DynamoDB（TodoTable） | AWS | 既存据置（C-1 — Node.js 20 / 256MB / 30s / オンデマンド + PITR）。マネージドサービスのみで QT-3 充足 | QT-1 / QT-3 / QT-4 / QT-5 / QT-9 |
| CMP-003 | Shared Contract | **物理リソースなし**（ビルド時のみ） | — | 定義専用パッケージ（runtime なし — functional-design Q5=a でソース直接参照）。Lambda へは NodejsFunction の esbuild バンドルに、frontend へは Vite ビルドに取り込まれて消える。該当なしを明示記録 | QT-7（CI 対象として — リソース外） |
| —（非コンポーネント / 新規） | オリジン検証 Secret | Secrets Manager Secret（OriginVerifySecret — 自動生成） | AWS | D-2: 自動生成 + CloudFormation 動的参照で平文 0 件・手動ステップゼロ（RF-20 整合） | QT-4 |
| —（非コンポーネント / 新規） | アラーム通知 | SNS Topic（AlarmTopic — 購読は手動） | AWS | D-5: トピックのみ CDK 作成。個人メールアドレスを構成に載せない | QT-6 |
| —（非コンポーネント / 新規） | 検知 | CloudWatch Alarm × 4（Lambda Duration / Errors、API GW Latency / 5xx） | AWS | D-4: パラメータは上流確定（本書 Observability 節でリソース定義に翻訳） | QT-1 / QT-2 / QT-6 |
| —（非コンポーネント / 新規） | Lambda 実行ログ | CloudWatch Logs LogGroup（明示作成・CDK 一意名・保持 90 日） | AWS | RF-17: deprecated `logRetention` の後継。カスタムリソース 1 つが消える（AR-O7） | QT-6 / C-1（保持 90 日維持） |
| —（非コンポーネント / 既存） | API アクセスログ | CloudWatch Logs LogGroup（ApiAccessLog — JSON フォーマット） | AWS | 既存据置（保持 90 日）。構造化済み（AR-O4 の唯一の構造化点）— 変更なし | QT-6 |
| —（非コンポーネント） | CI / E2E / Renovate | GitHub Actions / Playwright / Renovate（AWS リソースなし） | GitHub 他 | QT-7/8 の検証ゲートはクラウドリソースを持たない（CI からのデプロイはしない — デプロイは RF-20 の 1 コマンド手動）。実装 = code-generation | QT-7 / QT-8 |

> WAF / X-Ray / ダッシュボード / RUM / 複数環境化は対象外（C-8 / C-4 — 追加しないことが設計）。

## Compute

| Blueprint ID | Component | Compute type | Sizing | Scaling approach |
|---|---|---|---|---|
| CMP-001 | SPA 静的配信 | なし（S3 + CloudFront — オリジン/エッジ配信） | 該当なし | CloudFront エッジで自動（C-1 — 追加設計なし） |
| CMP-002 | 全 API（API-001〜006）を処理する単一 Lambda | serverless（Lambda — esbuild ESM バンドル、source map 有効） | **256MB / 30s 据置**（C-1 — BP-1 の所与。QT-1 違反が観測されるまでチューニングしない） | Lambda 同時実行の自動スケール + DynamoDB オンデマンド（デモ負荷で制約なし） |
| CMP-003 | （ビルド時のみ） | なし | 該当なし | 該当なし |

## Network Topology

> VPC なし — 全マネージド/パブリックサービス構成（既存据置）。ゾーンは VPC サブネットではなく
> 「到達制御の層」として定義する。

| Zone | Contains | Access |
|---|---|---|
| public（エッジ） | CloudFront Distribution（default: SPA / `/api/*`: API オリジン、キャッシュ無効、HTTPS 強制） | インターネット全体（認証なしデモ — A-2）。唯一の**意図経路** |
| public（マネージドエンドポイント） | API Gateway HTTP API（execute-api URL — 直接到達は技術的に可能） | 直接アクセスは検証ミドルウェア（BR-013 — 強制点 = CMP-002）により**全操作 403**（QT-4）。意図経路の証明 = CloudFront が付与するカスタムヘッダ |
| isolated 相当（IAM/OAC 制御） | S3 FrontendBucket（全公開ブロック + OAC のみ）/ DynamoDB TodoTable（Lambda 実行ロールの 5 アクションのみ）/ Secrets Manager Secret（デプロイ時動的参照のみ — 実行時アクセスなし）/ CloudWatch Logs / SNS | AWS サービス間 IAM のみ。インターネットから直接到達不可 |

経路図（変更点のみ — 基本トポロジーは RE architecture.md から不変）:

```
ブラウザ ──HTTPS──▶ CloudFront ──/api/* + x-origin-verify: <Secret>──▶ API GW ──▶ Lambda（検証MW: 一致しなければ403）
                              └─default──▶ S3 (OAC)
直接 execute-api ──（ヘッダなし）──▶ API GW ──▶ Lambda ──▶ 403（フェイルクローズ — D-1）
```

## Security Boundaries

| Boundary | Enforcement | Secrets approach |
|---|---|---|
| 意図経路の強制（QT-4 / BR-013 / RF-16） | CloudFront `/api/*` オリジンがカスタムヘッダ **`x-origin-verify`** を付与し、CMP-002 の検証ミドルウェア（実装 = code-generation）が一致を検証。不一致・欠落 = 403。フェイルオープン経路なし（D-1 — 検証は常時有効） | 本番値: Secrets Manager **OriginVerifySecret**（自動生成）を CloudFormation **動的参照**で 2 箇所へ注入（下記 construct 設計）。リポジトリ・synth テンプレートに平文 0 件（QT-4 の assert 対象） |
| DynamoDB アクセス（QT-5 / RF-14） | Lambda 実行ロールに **GetItem / PutItem / UpdateItem / DeleteItem / Scan の 5 アクションのみ** を Table ARN スコープで付与（`grantReadWriteData` を置換 — AR-O3 の v1 ドリフト解消。v1 設計 §6 への回帰）。条件付き書込（BR-007）は UpdateItem / DeleteItem の ConditionExpression で実現でき追加アクション不要 | 該当なし（IAM ロールのみ） |
| S3 静的アセット | 全公開ブロック + OAC（既存据置 — 変更なし） | 該当なし |
| ブラウザ側 | CloudFront セキュリティヘッダ / CSP `connect-src 'self'`（既存据置 — AR-O10。同一オリジン構成と整合） | 該当なし |
| ローカル開発経路（C-5） | 検証ミドルウェアは本番と同一コードパスで常時有効。dev 専用値を docker-compose / Vite proxy / Playwright 設定が注入（実装 = code-generation） | dev 値 = `local-dev-only`（自明な値・リポジトリにコミット — C-5 で本番値と完全独立と確定。CMP-003 には置かない） |

### オリジン検証の construct 設計（QT-4 / RF-16 の IaC 側 — 実装は code-generation）

| 要素 | 設計 |
|---|---|
| Secret リソース | `secretsmanager.Secret`（ID: `OriginVerifySecret`）。`generateSecretString: { passwordLength: 32, excludePunctuation: true }` — プレーン文字列（JSON キーなし）。HTTP ヘッダ値として安全な文字集合に限定。名前は CDK 自動命名（C-4 — 単一環境で固定名不要） |
| CloudFront 側注入 | `/api/*` オリジンを `new origins.HttpOrigin(apiDomain, { customHeaders: { "x-origin-verify": secret.secretValue.unsafeUnwrap() } })` へ変更。`unsafeUnwrap()` は同一スタック生成 Secret では CloudFormation 動的参照 `{{resolve:secretsmanager:...}}` としてテンプレートに現れる（平文ではない — infrastructure テストの assert 対象） |
| Lambda 側注入 | `environment` に `ORIGIN_VERIFY_SECRET: secret.secretValue.unsafeUnwrap()` を追加（同じく動的参照）。デプロイ時解決のため Lambda 実行ロールに secretsmanager の実行時権限は**不要**（最小権限維持） |
| ヘッダ名 / 環境変数名 | ヘッダ `x-origin-verify` / 環境変数 `ORIGIN_VERIFY_SECRET`（本ステージで確定 — 検証ミドルウェア・ローカル注入 3 箇所が共有する契約値） |
| ローテーション特性 | 自動ローテーションは構成しない（デモ — nfr パターン表の trade-off どおり）。値変更時は再デプロイで CloudFront / Lambda 両方へ再配布される（動的参照はデプロイ時解決） |
| 失敗モード | Secret 参照切れ → デプロイ時失敗（フェイルファスト）。値不整合 → 全リクエスト 403 → 本番は API-006 監視・ローカル/CI は E2E BT-7 で即検知 |

### CfnOutput の整理（Q1=a）

| Output | 処置 | 説明文 |
|---|---|---|
| `CloudFrontUrl` | 維持（変更なし） | 既存どおり |
| `ApiUrl` | **維持 + 説明文更新**（Q1=a） | 「オリジン検証により直接アクセスは 403（意図経路は CloudFront のみ）」— QT-4 受入確認・障害切り分けの検証手段として残す（AR-P2 (c) の「意図した公開」の明文化） |
| `TableName` | 維持（変更なし) | 既存どおり |
| `AlarmTopicArn` | **新規追加** | SNS トピック ARN — README の購読手順 1 行（D-5）が参照する |

## Observability

| Concern | Approach | Tooling |
|---|---|---|
| アプリケーションログ | 構造化 JSON ログ（Powertools Logger — D-6。接続実装 = code-generation）。出力先は下記の明示 LogGroup | CloudWatch Logs（保持 90 日 — C-1） |
| Lambda ロググループ | **明示 LogGroup へ移行**（RF-17 / AR-O7）: `logs.LogGroup`（ID: `TodoApiFunctionLogGroup`、`logGroupName` 指定なし = CDK 一意名、retention 90 日、RemovalPolicy.DESTROY）を作成し NodejsFunction の `logGroup` プロパティへ渡す。`logRetention` 行は削除（Custom::LogRetention カスタムリソースとその Lambda が消える） | CloudWatch Logs |
| 旧ロググループ（Q2=a） | 既存 `/aws/lambda/<関数名>` はスタック管理外で**残置を許容**（注記のみ）。名前が異なるため新 LogGroup と衝突しない。既存の保持設定 90 日により旧ログは自然失効し、空グループに追加コストなし。手動削除ステップは追加しない（手動は SNS 購読とブランチ保護の 2 つのみ — 運用制約維持） | — |
| API アクセスログ | 既存据置（ApiAccessLog — JSON フォーマット・90 日）— 変更なし | CloudWatch Logs |
| メトリクス・アラーム | 下表の 4 アラーム（D-4 パラメータの翻訳）。全アラームの alarmAction = AlarmTopic（D-5） | CloudWatch Alarms + SNS |
| 通知 | SNS AlarmTopic（購読は手動 — README 1 行。`AlarmTopicArn` 出力が支える） | SNS |
| トレーシング / ダッシュボード / RUM | 対象外（C-8 / OOS-9） | — |

### アラームリソース定義（D-4 / QT-1 / QT-2 / QT-6 — 実装は code-generation）

| # | Alarm ID（CDK） | Metric（CDK 取得法） | Statistic | Threshold / Comparison | Period | Datapoints | treatMissingData |
|---|---|---|---|---|---|---|---|
| 1 | `LambdaDurationP95Alarm`（主） | `todoFunction.metricDuration()`（AWS/Lambda Duration） | p95 | > 500ms（GreaterThanThreshold） | 5 分 | 3/3 | notBreaching |
| 2 | `ApiLatencyP99Alarm`（補助） | `httpApi.metricLatency()`（AWS/ApiGateway Latency — ApiId 次元） | p99 | > 1500ms（GreaterThanThreshold） | 5 分 | 3/3 | notBreaching |
| 3 | `LambdaErrorsAlarm` | `todoFunction.metricErrors()`（AWS/Lambda Errors） | Sum | ≥ 1（GreaterThanOrEqualToThreshold） | 5 分 | 1/1 | notBreaching |
| 4 | `Api5xxAlarm` | `httpApi.metricServerError()`（AWS/ApiGateway 5xx） | Sum | ≥ 1（GreaterThanOrEqualToThreshold） | 5 分 | 1/1 | notBreaching |

- 全アラーム: `alarmAction = SnsAction(alarmTopic)`。OK アクションは設定しない（上流 D-4/D-5 の決定範囲外 — 追加しない）。
- パーセンタイルアラームの `evaluateLowSampleCountPercentile` は既定（evaluate）のまま — 低トラフィックの平滑化は上流確定の「5 分 × 3 連続 + notBreaching」で行い、本ステージで新パラメータを足さない。
- 403 / 400 はクライアント起因でありいずれのアラームにも乗らない（Lambda Errors = 未処理例外のみ、5xx ≠ 4xx — nfr API Quality Annotations どおり）。

## Deployment Strategy

| Aspect | Decision | Rationale |
|---|---|---|
| IaC tool | AWS CDK（TypeScript）現行版 — **完全固定宣言を維持**（CLI 2.1000 系と lib の体系分離に追随） | C-2 / RF-18 / SECURITY-10。バージョン更新の実施 = code-generation |
| スタック構成 | `TodoStack` 単一スタック据置（新規リソース 4 区分も同スタックへ追加） | C-1 / C-4 — 単一環境・分割の必要なし。`TodoTable` 固定名も据置（A-5 / OOS-8） |
| Deploy method | CloudFormation rolling 更新（`cdk deploy` 1 コマンド — RF-20）。BucketDeployment が S3 同期 + CloudFront invalidation、NodejsFunction が backend を esbuild バンドル | 既存方式の維持。blue-green / canary はデモ単一環境に過剰（C-4） |
| ビルド順序制約 | **`frontend build` → `cdk synth/deploy`**（DEP-O2 — `Source.asset(frontend/dist)` が dist の存在を要求）。CMP-003 はソース直接参照のため独立ビルド不要（CMP-003 → CMP-001/002 → IaC バンドルの順序は型解決として自明に満たされる — DEP-O1）。**CI の `cdk synth` ジョブも frontend build を先行ステップに置くこと**（workflow 実装 = code-generation への必須引き継ぎ） | unit-dependencies.md / RF-20 |
| Rollback | CloudFormation 自動ロールバック（デプロイ失敗時）+ 直前コミットの再デプロイ（手動・1 コマンド）。データ面は DynamoDB PITR（C-1 据置）。RTO 期待値: デモ用途 — 分単位で許容 | 単一環境・ステートレス Lambda のため追加機構不要 |
| デプロイ時の新規挙動 | 初回デプロイで Secret 生成 → 動的参照解決 → CloudFront/Lambda へ注入が 1 回のデプロイで完結（手動ステップゼロ — D-2）。手動は SNS 購読（README 1 行）と GitHub ブランチ保護の 2 つのみ | RF-20 / D-5 / 運用制約（unit.md） |
| CI とデプロイの分離 | CI（GitHub Actions）は検証のみ（synth まで）。AWS へのデプロイ権限を CI に与えない（OIDC 等の構成もしない） | 要件外の権限を作らない（最小権限の姿勢）。デプロイは RF-20 の 1 コマンド手動 |

## 変更明細 — 現行 todo-stack.ts からの差分設計（RF-12 / RF-14 / RF-17 / Q1。実装 = code-generation）

> 行番号は現行 `packages/infrastructure/lib/todo-stack.ts`（本書執筆時点）。

| # | 種別 | 現行箇所 | 変更内容 | 出典 |
|---|---|---|---|---|
| CH-1 | 置換 | `todo-stack.ts:27` `pointInTimeRecovery: true` | `pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true }` へ移行（挙動不変 — PITR 有効維持） | RF-17 / AR-O7 |
| CH-2 | 置換 | `todo-stack.ts:49` `logRetention: logs.RetentionDays.THREE_MONTHS` | 削除し、明示 `logs.LogGroup`（TodoApiFunctionLogGroup — CDK 一意名 / 90 日 / DESTROY）を新設して `logGroup` プロパティで渡す。旧 `/aws/lambda/<関数名>` は残置（Q2=a — Observability 節の注記が正） | RF-17 / AR-O7 / Q2 |
| CH-3 | 置換 | `todo-stack.ts:53` `todoTable.grantReadWriteData(todoFunction)` | `todoTable.grant(todoFunction, "dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:DeleteItem", "dynamodb:Scan")` — 5 アクション限定（コメントの SECURITY-06 参照は維持し実態を一致させる） | QT-5 / RF-14 / AR-O3 |
| CH-4 | 削除 | `todo-stack.ts:63-67` `corsPreflight: {...}` | ブロック削除（CORS 0 箇所 — Hono `cors()` 側の撤去は code-generation。同一オリジン前提は api-specification.md に明文化済み） | RF-12 / functional-design Q2=a |
| CH-5 | 追加 | （新規） | `OriginVerifySecret`（Secrets Manager — Security Boundaries 節の設計どおり） | QT-4 / D-2 |
| CH-6 | 変更 | `todo-stack.ts:143` `new origins.HttpOrigin(apiDomain)` | `customHeaders: { "x-origin-verify": <Secret 動的参照> }` を追加 | QT-4 / D-2 |
| CH-7 | 追加 | `todo-stack.ts:38-41` `environment` | `ORIGIN_VERIFY_SECRET: <Secret 動的参照>` を追加 | QT-4 / D-2 |
| CH-8 | 追加 | （新規） | `AlarmTopic`（SNS）+ アラーム 4 種（Observability 節の定義どおり）+ 全アラームへ SnsAction 接続 | QT-6 / D-4 / D-5 |
| CH-9 | 変更 | `todo-stack.ts:194-197` `ApiUrl` 出力 | 維持・説明文を「オリジン検証により直接アクセスは 403（意図経路は CloudFront のみ）」へ更新 | Q1=a |
| CH-10 | 追加 | （新規） | `AlarmTopicArn` CfnOutput | D-5 |

> 変更しないもの（据置の明示）: DynamoDB（テーブル名・キー・課金・DESTROY）/ Lambda（runtime・メモリ・タイムアウト・バンドル設定）/ API GW ルート（`/{proxy+}` ANY）/ ApiAccessLog / S3 / OAC / セキュリティヘッダ・CSP / errorResponses / PriceClass / BucketDeployment — C-1 / BP-1。

## Infrastructure テスト assert 項目（QT-3/4/5/6 → Template assertions。実装 = code-generation）

| # | Assert | 検証する QT / RF |
|---|---|---|
| IT-1 | Lambda 実行ロールの DynamoDB ポリシーが**ちょうど 5 アクション**（GetItem / PutItem / UpdateItem / DeleteItem / Scan、Resource = TodoTable ARN）であること | QT-5 / RF-14 |
| IT-2 | `AWS::ApiGatewayV2::Api` に `CorsConfiguration` が存在しないこと | RF-12 |
| IT-3 | Secrets Manager Secret が `GenerateSecretString` 付きで存在すること（平文の `SecretString` 直指定がないこと） | QT-4 / D-2 |
| IT-4 | CloudFront `/api/*` オリジンの `OriginCustomHeaders` に `x-origin-verify` があり、値が `{{resolve:secretsmanager:` 動的参照であること（テンプレート内に平文値が 0 件） | QT-4 |
| IT-5 | Lambda 環境変数 `ORIGIN_VERIFY_SECRET` の値が `{{resolve:secretsmanager:` 動的参照であること | QT-4 |
| IT-6 | CloudWatch Alarm が 4 つ存在し、各メトリクス / statistic（p95 / p99 / Sum）/ 閾値（500 / 1500 / 1 / 1）/ period（300s）/ evaluationPeriods・datapointsToAlarm（3/3・1/1）/ TreatMissingData（notBreaching）が定義どおりであること | QT-1 / QT-2 / QT-6 / RF-15 |
| IT-7 | SNS トピックが存在し、4 アラームすべての `AlarmActions` が同トピックを参照すること | QT-6 / D-5 |
| IT-8 | Lambda の `LoggingConfig` が明示 LogGroup を参照し、`Custom::LogRetention` リソースがテンプレートに存在しないこと。LogGroup の retention = 90 日 | RF-17 / C-1 |
| IT-9 | DynamoDB の `PointInTimeRecoverySpecification.PointInTimeRecoveryEnabled = true`、`BillingMode = PAY_PER_REQUEST`、`TableName = TodoTable` であること（移行での挙動退行ガード） | RF-17 / C-1 / C-4 |
| IT-10 | テンプレートに VPC 関連リソースが存在しないこと（全マネージド構成の維持）。`ApiUrl` / `AlarmTopicArn` の CfnOutput が存在すること | QT-3 / Q1 / D-5 |

## Copied Blueprint Expansions

| Blueprint ID | Expansion Target | Infrastructure Detail Added |
|---|---|---|
| CMP-001 | components.yaml（本ステージ版） | Infrastructure-Mappings: S3 + CloudFront + BucketDeployment（据置）、OAC/IAM、CDN スケーリング、observability なし（RUM 対象外）の明示 |
| CMP-002 | components.yaml（本ステージ版） | Infrastructure-Mappings: Lambda / API GW / DynamoDB の物理マッピング、IAM 5 アクション、環境変数（TABLE_NAME / NODE_OPTIONS / ORIGIN_VERIFY_SECRET）、明示 LogGroup、アラーム 4 種の対象 |
| CMP-003 | components.yaml（本ステージ版） | Infrastructure-Mappings: 物理リソースなし（ビルド時取込）の明示記録 |
| UNIT-001 | unit.md（本ステージ版） | デプロイトポロジー / IaC モジュール参照 / ランタイム構成 / 運用所有 / OQ 残余ゼロ確認を追記 |

## トレーサビリティ（本ステージの着地と残余委譲）

| RF / 決定 | 本ステージの着地 | 残余の委譲先（code-generation） |
|---|---|---|
| RF-12（CORS 一元化 — IaC 側） | CH-4（corsPreflight 削除設計）+ IT-2 | CDK コード変更・Hono `cors()` 撤去・E2E での全 BT 確認 |
| RF-14（IAM 最小権限） | CH-3（5 アクション grant 設計）+ IT-1 | CDK コード変更・infrastructure テスト実装 |
| RF-15（アラーム） | アラーム 4 種 + SNS のリソース定義（Observability 節）+ CH-8/CH-10 + IT-6/IT-7 | CDK コード変更・テスト実装・README 購読 1 行 |
| RF-16（オリジン検証 — IaC 側） | construct 設計（Secret / customHeaders / env — Security Boundaries 節）+ CH-5〜7 + IT-3〜5。ヘッダ名 `x-origin-verify` / 環境変数名 `ORIGIN_VERIFY_SECRET` を確定 | 検証ミドルウェア実装・ローカル 3 箇所（compose / Vite proxy / Playwright)への dev 値注入・E2E BT-7 |
| RF-17（deprecated 移行） | CH-1 / CH-2（移行設計 + 旧ロググループ Q2=a）+ IT-8/IT-9 | CDK コード変更（CDK バージョン更新 RF-18 と同時実施） |
| RF-20（1 コマンドデプロイ） | ビルド順序制約の明文化（Deployment Strategy 節 — CI synth の frontend build 先行を含む） | デプロイスクリプト・README 整備 |
| Q1 / Q2（本ステージ裁量） | CH-9（ApiUrl 維持 + 説明文更新）/ 旧ロググループ残置の注記（Observability 節） | — （完結） |

## コスト増分

Secrets Manager 約 +$0.40/月のみが有意。アラーム 4 本（無料枠 10 本内 / 超過時 $0.10/本）・SNS・追加 LogGroup は無料枠/微小 — nfr-design 運用制約の見積りから変更なし。

## セルフチェック記録

- 制約遵守: C-1〜C-9 違反なし — 実行基盤値の変更ゼロ、手動ステップ追加ゼロ（Q2=a）、スコープ外リソース（WAF / X-Ray / ダッシュボード / 複数環境）追加ゼロ、CDK 固定方針維持。
- 上流再決定なし: D-1〜D-7 / QT-1〜9 / functional-design Q1〜Q5 の決定はすべて翻訳のみ。本ステージの新規決定は Q1 / Q2（人間承認済み）とヘッダ名・環境変数名・Secret 文字集合・アラーム ID の命名のみ。
- copy-forward identity: components.yaml / unit.md は nfr-design 版から既存ブロック不変で拡張（各ファイルのヘッダに記録）。
