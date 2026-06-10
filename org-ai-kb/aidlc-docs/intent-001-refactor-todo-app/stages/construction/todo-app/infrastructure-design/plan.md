# Plan — infrastructure-design / unit: todo-app

> Stage: infrastructure-design / Owner: aidlc-systems-architect-agent / 2026-06-10
> 目的: nfr-design の論理設計（QT-1〜QT-9 / D-1〜D-7 / C-1〜C-9）を実際の AWS リソース構成と
> デプロイアーキテクチャへ落とす。具体の construct 構成・IAM・アラーム・Secret 注入・deprecated 移行を
> 設計し、実装（CDK コード変更・テスト実装）は code-generation へ委譲する。

## 入力（Artifact Resolution）

| 必要知識 | 使用成果物 | 状態 |
|---|---|---|
| NFR 仕様（必須） | `stages/construction/todo-app/nfr-design/nfr-specification.md`（QT-1〜9 / Tech Stack / Patterns / C-1〜9） | あり — 本ステージの正 |
| copy-forward 元（必須） | nfr-design 版 `components.yaml` / `unit.md` | あり — 本ステージで物理マッピングを追記拡張 |
| API 仕様・機能設計 | nfr-design 版 `api-specification.md`、functional-design `rules.yaml`（BR-013 等） | あり |
| ビルド・デプロイ順序 | units-generation `unit-dependencies.md`（CMP-003 → CMP-001/002 → IaC バンドル、DEP-O1/O2） | あり |
| unit 間契約 | `contracts/` | **不存在 — fallback**: 単一 unit のため contract-design は対象なし（unit-dependencies.md が根拠）。unit 間統合点ゼロを前提に設計する |
| 既存インフラ（brownfield 基線） | RE `architecture.md`（AR-O1〜O10 / AR-P1〜P7）+ 実コード `packages/infrastructure/lib/todo-stack.ts` | あり — 現行 TodoStack の構成・deprecated 使用箇所（`pointInTimeRecovery` / `logRetention`）を直接確認済み |
| v1 設計（IAM 回帰元） | `aidlc-docs/construction/infrastructure/infrastructure-design/infrastructure-design.md` §6（QT-5 の出典 — AR-O3 ドリフトの解消先） | あり（参照のみ） |

## 設計の射程

**このステージで決める（成果物に固定する）:**

1. サービスマッピング: CMP-001 → S3 + CloudFront（既存据置）、CMP-002 → API GW HTTP API + Lambda + DynamoDB（既存据置）、CMP-003 → 物理リソースなし（ビルド時のみ — 該当なしの根拠を記録）
2. 新規リソース設計: Secrets Manager Secret（自動生成 — D-2）、SNS トピック（D-5）、CloudWatch アラーム 4 種（D-4 パラメータをリソース定義に翻訳）、Lambda 用明示 LogGroup（RF-17）
3. オリジン検証の構成設計（QT-4 / RF-16 の IaC 側）: CloudFront `/api/*` オリジンのカスタムヘッダへ Secret を動的参照で注入 + Lambda 環境変数へ同 Secret を動的参照で注入（検証ミドルウェア実装は code-generation）
4. IAM 最小権限設計（QT-5 / RF-14）: `grantReadWriteData` → 5 アクション明示 grant（GetItem / PutItem / UpdateItem / DeleteItem / Scan）
5. deprecated 移行設計（RF-17 / AR-O7）: `pointInTimeRecovery` → `pointInTimeRecoverySpecification`、`logRetention` → 明示 `logGroup`（旧ロググループの扱いは Q2）
6. CORS の IaC 側撤去設計（RF-12 — functional-design Q2=a）: API GW `corsPreflight` 削除
7. CfnOutput の整理: `ApiUrl` の扱い（Q1）、SNS トピック ARN 出力の追加（購読手順 — D-5 の README 1 行を支える）
8. デプロイ戦略: CDK（完全固定 — C-2）/ CloudFormation rolling 更新 / ロールバック方式、`cdk synth` が `frontend/dist` を要求する CI 上の順序制約（DEP-O2）の明文化
9. infrastructure テストが assert すべき項目一覧（QT-3/4/5/6 の受入基準を test 仕様化 — 実装は code-generation）

**このステージで決めない（委譲）:**

- 検証ミドルウェア・Powertools Logger 接続・CI workflow・E2E・docker-compose のヘッダ注入の実装 = code-generation
- 性能チューニング（メモリ増等）= QT-1 違反観測後（C-1）
- WAF / X-Ray / ダッシュボード / 複数環境化 = スコープ外（C-8 / C-4）

## 設計パラメータ（上流確定分 — 再決定しない）

| # | パラメータ | 値 | 出典 |
|---|---|---|---|
| P-1 | Secret 注入先 | CloudFront オリジンカスタムヘッダ + Lambda 環境変数（いずれも CloudFormation 動的参照） | D-2 |
| P-2 | アラーム 4 種 | Lambda Duration p95 > 500ms（5 分 × 3/3）/ API GW Latency p99 > 1500ms（5 分 × 3/3）/ Lambda Errors Sum ≥ 1（1/1）/ API GW 5xx Sum ≥ 1（1/1）。missing = notBreaching | D-4 / QT-1/2/6 |
| P-3 | 通知 | SNS トピックのみ CDK 作成・全アラームのアクションに接続・購読は手動（README 1 行） | D-5 |
| P-4 | IAM | DynamoDB 5 アクション限定 | QT-5 / RF-14 |
| P-5 | 実行基盤 | Lambda Node.js 20 / 256MB / 30s、DynamoDB オンデマンド + PITR、`TodoTable` 固定名、単一スタック、ログ保持 90 日 — すべて据置 | C-1 / C-4 |
| P-6 | CORS | API GW `corsPreflight` / Hono `cors()` とも撤去（0 箇所） | functional-design Q2=a / RF-12 |
| P-7 | IaC | AWS CDK 現行版・完全固定宣言維持 | C-2 / RF-18 |

## Steps

- [x] Step 1: 入力読込と確定事項の整理（nfr-design 3 成果物・unit-dependencies・RE architecture・実コード todo-stack.ts を確認。deprecated 2 箇所と CORS 二重定義箇所を実コードで特定済み）
- [x] Step 2: questions.md 作成（Q1〜Q2 — 残る運用裁量 2 点のみ）
- [x] Step 3: 回答レビュー — Q1=a / Q2=a を確認（2026-06-10 人間レビュー済み）。いずれも plan の前提と整合し改訂不要
- [x] Step 4: `infrastructure-specification.md` 作成（テンプレート準拠 + 拡張）
  - [x] 4a: Service Mapping（CMP-001/002/003 + 非コンポーネント要素。Rationale と NFR Satisfied 列で QT へ遡及）
  - [x] 4b: Compute（Lambda 据置値の根拠 = C-1、スケーリング = 自動同時実行 + オンデマンド）
  - [x] 4c: Network Topology（VPC なし・全マネージド。CloudFront → S3(OAC) / → API GW、意図経路と直接経路の扱い）
  - [x] 4d: Security Boundaries（オリジン検証ヘッダの construct 設計・Secret 自動生成と動的参照・IAM 5 アクション・dev 値の注入点 — C-5。Q1 の決定を反映。ヘッダ名 `x-origin-verify` / 環境変数名 `ORIGIN_VERIFY_SECRET` を確定）
  - [x] 4e: Observability（アラーム 4 種のリソース定義・SNS・明示 LogGroup 移行と API アクセスログ据置。Q2 の決定を反映）
  - [x] 4f: Deployment Strategy（CDK 固定 / rolling / ロールバック = CloudFormation 自動 + 再デプロイ、`cdk synth` の frontend/dist 順序制約、RF-20 1 コマンドデプロイとの整合）
  - [x] 4g: RF-17 deprecated 移行設計 + RF-12 IaC 側撤去 + CfnOutput 整理の明細（変更明細 CH-1〜CH-10 — 現行コード行参照付き）
  - [x] 4h: infrastructure テスト assert 項目一覧（IT-1〜IT-10 — QT-3/4/5/6 → Template assertion の対応表。実装委譲先を明記）
  - [x] 4i: Copied Blueprint Expansions 表（CMP-001/002/003 / UNIT-001 への追記内容の索引）
- [x] Step 5: `components.yaml` copy-forward — nfr-design 版を全ブロック不変でコピーし、各 Component に `Infrastructure-Mappings` ブロックのみ追記（compute / storage / network / IAM / observability。正は infrastructure-specification.md。blueprint identity 維持）
- [x] Step 6: `unit.md` copy-forward — nfr-design 版を全節不変でコピーし、「デプロイトポロジー / IaC モジュール参照 / ランタイム構成 / 運用所有」の節と OQ 解決状況（残余ゼロ確認）を追記
- [x] Step 7: セルフチェック
  - [x] 7a: トレーサビリティ — RF-12/14/15/16/17 の本ステージ着地と code-generation への残余委譲をトレーサビリティ表に明記
  - [x] 7b: 制約遵守 — C-1〜C-9 違反なし（基盤値変更ゼロ・手動ステップ追加ゼロ・スコープ外リソースゼロ — infrastructure-specification.md セルフチェック記録）
  - [x] 7c: identity 不変 — copy-forward 2 ファイルは既存ブロック不変（追記は Infrastructure-Mappings / 末尾 4 節 + ヘッダ注記のみ）
- [x] Step 8: `state/state.json` 更新（status = artifact-generated、outputs に 3 成果物を登録)
