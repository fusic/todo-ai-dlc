# Unit Definition — todo-app (UNIT-001)

> Stage: nfr-design / Owner: aidlc-systems-architect-agent / 2026-06-10
> copy-forward: functional-design 版 `unit.md` を全節不変のままコピーし、末尾に「NFR posture / 技術選定 /
> 運用制約」と「申し送り #3/#4/#6 の解決」のみを追記した（blueprint identity 維持）。
> 原本: `stages/construction/todo-app/functional-design/unit.md`（その原本は `stages/inception/units-generation/units.md`）。
>
> ＜functional-design 時点のヘッダ（保存）＞
> Stage: functional-design / Owner: aidlc-systems-architect-agent / 2026-06-10
> copy-forward: units-generation `units.md` の UNIT-001 定義を ID・Purpose・Responsibilities・Boundaries・
> Packaging・Build independence・Change rate 不変のままコピーし、末尾に「functional-design 成果物への参照」と
> 「申し送りの解決状況」のみを追記した（blueprint identity 維持）。原本: `stages/inception/units-generation/units.md`。

## Unit Inventory

| Unit ID | Unit | Purpose | Packaging Assumption | Components Owned |
|---|---|---|---|---|
| UNIT-001 | todo-app | RF-01〜22 のリファクタリング全件を、BP-1（振る舞い保持）の単一検証ゲート（RF-01/02）の保護下で安全に実施するための、システム全体を束ねた開発・デプロイ単位 | 単一リポジトリ（pnpm monorepo — 本 intent 完了時 4 workspace パッケージ）+ 単一デプロイ束（IaC が全コンポーネントを同時デプロイ）。モジュラーモノリス相当 | CMP-001, CMP-002, CMP-003 |

## Unit Details（units-generation 版から不変）

- **ID:** UNIT-001
- **Purpose:** 3 コンポーネント + 非コンポーネント要素 5 区分を 1 つの作業・デプロイ束にまとめ、construction を 1 周で回す（fan-out 単位 = 1）。
- **Responsibilities:**
  - TODO 管理のビジネストランザクション BT-1〜BT-7 全件の提供と保持（操作面 = CMP-001、API 面 = CMP-002）
  - frontend/backend 間コントラクトの単一ソース管理（CMP-003、RF-03）
  - RF-01〜22 の全リファクタリングの実施（P0 検証ゲート → P1 実装品質 → P2 基盤の順序は unit-story-map.md のフェーズ列が規定）
  - 検証ゲートの所有: CI（RF-01）と E2E スモーク（RF-02）による BP-1 の継続的証明
  - 実行基盤・開発基盤の保守: IaC（RF-12/14/15/16/17）、開発環境・依存管理（RF-18〜21）、文書（RF-22）
- **Boundaries:**
  - 新機能（OOS-10）・認証認可（OOS-1）・WAF（OOS-2）・API 意味論変更（OOS-3〜5）・zod v4 / OpenAPI（OOS-6/7）は本 unit の仕事ではない（requirements.md の Out of Scope）
  - クラウドリソースの具体構成・デプロイ順序の最終決定はしない — construction の infrastructure-design の管轄（本ステージは build 順序の引き継ぎまで — unit-dependencies.md）
  - unit 間 API コントラクトの定義は不要 — 単一 unit のため contract-design の unit 間契約対象が存在しない
- **Packaging assumption:** 現状実態（pnpm workspace + CDK 単一スタックが CMP-002 ソースをバンドルし CMP-001 dist を参照する結合 = DEP-O1/O2）をそのまま尊重する。クラウド・ランタイムの選定は行わない。
- **Build independence:** 他 unit が存在しないため unit としては自明に独立。unit 内には build 順序制約がある（CMP-003 → CMP-001/CMP-002 → IaC バンドル — unit-dependencies.md に記録）。
- **Change rate:** 本 intent 期間中は P0 → P1 → P2 の 3 フェーズで段階的に変更される（変更レートの差は unit 境界ではなくフェーズで表現 — Q3=a）。intent 完了後は教材リポジトリとして低頻度（依存自動更新 RF-19 による定常 PR のみ）。

## functional-design 成果物への参照（本ステージで追記）

| 成果物 | 内容 | 本 unit 定義との関係 |
|---|---|---|
| `entities.yaml` | ENT-001 Todo の詳細スキーマ（属性 6 件 + 制約） | Responsibilities「BT-1〜BT-7 の提供と保持」のデータ面の正 |
| `rules.yaml` | BR-001〜BR-014（検証・生成規則・順序保証・エラー意味論・経路強制・公開面規則） | 業務ルールの正。強制点 = CMP-002（BR-014） |
| `api-specification.md` | API-001〜API-006 + 共通エラー + 通信前提（CORS 0 箇所 — Q2=a）+ versioning（後方互換）+ OQ-1〜3 | Boundaries「unit 間契約なし」の下での provider 仕様。BP-1 受入基準 3 の参照対象を v2 化 |
| `functional-spec.md` | ER 図 / SM-001 / WF-001〜WF-007 / Rules Summary / 設計決定 Q1〜Q5 の記録 | 人間可読ビュー（YAML が正） |
| `components.yaml`（本ステージ版） | CMP-001/002/003 へ Functional-Design-References を追記した copy-forward | Components Owned の blueprint 拡張（ID・境界不変） |
| `unit-story-map.md`（本ステージ版） | 29 行へ機能設計参照列を追記した copy-forward | Responsibilities の RF/BT トレーサビリティ強化 |

## 申し送りの解決状況（units.md「申し送り 8 件の仕分け」のうち本ステージ管轄分）

| # | 申し送り | 本ステージの決定（questions.md） |
|---|---|---|
| 1 | RF-06 の実現箇所 + 第 2 ソートキー | **解決（Q1=a）**: CMP-002 で実現・コントラクト化。第 2 キー = id 降順 → BR-010 |
| 2 | RF-12 の集約先 | **解決（Q2=a）**: 両方撤去（0 箇所）。同一オリジン前提を api-specification.md に明文化。IaC 側の撤去実施は infrastructure-design / code-generation |
| 5 | RF-03 テスト境界値リテラル | **解決（Q3=a）**: リテラル維持（独立検証点） |
| 7（設計観点） | CMP-003 の公開面・ビルド形態 | **解決(Q4=a / Q5=a)**: 型+定数 / schema の公開面分離（BR-014）、ビルドなし（ソース直接参照） |
| 3 / 4 / 6 | RF-16 ローカル経路・audit 閾値・アラーム統計 | **委譲継続**: api-specification.md の OQ-1〜OQ-3 として nfr-design / infrastructure-design へ |
| 8 | RF-22① v1 文書更新 | **委譲継続**: code-generation（本ステージは RF-22② の v2 側のみ — API-004 / BR-006 で文書化済み） |

## NFR Posture（nfr-design で追記 — 正は nfr-specification.md）

| 観点 | posture | QT / 決定 |
|---|---|---|
| performance | NFR-001 の正式計測点 = **Lambda Duration p95 ≤ 500ms**（コールドスタートはメトリクス定義で除外）。API GW Latency p99 ≤ 1500ms は経路全体の補助検知。フロント初回ロード 3 秒は計測対象外（OOS-9） | QT-1 / QT-2（D-4） |
| availability | マネージドサービス SLA 準拠のみ（追加の可用性設計なし — 単一環境 A-5） | QT-3 |
| security | 意図経路の強制（403 — フェイルクローズ・検証ミドルウェア常時有効）+ 本番ヘッダ値は Secrets Manager 自動生成・動的参照（平文 0 件）+ IAM 5 アクション限定 + エラー非開示（BR-012 — 確定済み） | QT-4 / QT-5（D-1 / D-2） |
| reliability | 更新・削除のアトミック化（TOCTOU 0・DynamoDB 呼出 各 1 回） | QT-9（BR-007 / RF-07） |
| observability | 構造化ログ（JSON・必須フィールド規定）+ アラーム 4 種 + SNS 通知。「人手のログ確認なしに検知」を検知・通知・調査可能性の 3 点で充足 | QT-6（D-4 / D-5 / D-6） |
| continuous verification | CI 6 ジョブ（lint / typecheck / test / synth / audit high / E2E）が全変更のゲート。E2E は BR-013 検証ロジック込みの本番同一コードパスを通る | QT-7（D-1 / D-3 / D-7） |
| dependency health | high 以上の CVE 0 件で main 維持 + Renovate 自動更新 PR | QT-8（D-3 / RF-19） |

## 技術選定（nfr-design で追記 — 選定理由・代替案は nfr-specification.md Tech Stack）

| 領域 | 選定 | 決定 |
|---|---|---|
| 構造化ログ | AWS Lambda Powertools for TypeScript（Logger） | D-6 |
| E2E | Playwright（@playwright/test）on docker-compose（A-7） | D-7 |
| CI | GitHub Actions（A-4 — 確定済み前提） | — |
| Secret 管理 | AWS Secrets Manager（自動生成 + CloudFormation 動的参照） | D-2 |
| アラーム通知 | Amazon SNS（トピックのみ CDK 作成・購読手動） | D-5 |
| 依存自動更新 | Renovate（グループ化設定付き） | RF-19 |
| バージョン到達点 | Vitest 3 / Vite 7 / Biome 2 / CDK 現行版・完全固定維持（zod 3 系据置 — OOS-6） | RF-18（確定済み前提） |

## 運用制約（nfr-design で追記）

- **C-1（実行基盤据置）**: Lambda 256MB/30s / DynamoDB オンデマンド + PITR / ログ保持 90 日は BP-1 の所与。チューニングは QT-1 違反の観測後に検討
- **C-5（dev ヘッダ値）**: dev 専用値はリポジトリにコミット（`local-dev-only` 等の自明な値）。RF-16 受入基準の「ヘッダ値はハードコードされない」は「本番ヘッダ値は」と解釈（本番値は D-2 で平文 0 件）
- **C-6（audit ignore 運用）**: 修正不能 advisory は `auditConfig.ignoreCves` に理由コメント付きで登録し、Renovate 解消時に削除
- **手動ステップは 2 つのみ**: SNS 購読（D-5 — README に 1 行）と GitHub リポジトリ側のブランチ保護設定（RF-01 の運用明記）。デプロイ自体は 1 コマンド維持（RF-20 と整合 — D-2 の選定理由）
- コスト増分: Secrets Manager 約 +$0.40/月のみ（SNS・アラーム・ログは無料枠/微小 — WAF 除外 OOS-2 の判断と整合）

## 申し送り #3 / #4 / #6 の解決（nfr-design で追記 — functional-design 版の表の「委譲継続」分）

| # | 申し送り（OQ） | 本ステージの決定（questions.md） | 残余の委譲 |
|---|---|---|---|
| 3 | RF-16 ローカル経路 + Secret 可視性（OQ-1） | **解決（Q1=a / Q2=a — D-1 / D-2）**: ローカルは dev 値ヘッダ注入・検証常時有効、本番は Secrets Manager 自動生成 + 動的参照（平文 0 件） | construct 構成（CloudFront ヘッダ付与・Secret 注入）= infrastructure-design / 検証ミドルウェア実装 = code-generation |
| 4 | CI の audit severity 閾値（OQ-2） | **解決（Q3=a — D-3）**: `--audit-level=high` + ignoreCves 運用（C-6） | workflow 実装 = code-generation |
| 6 | レイテンシアラームの統計・評価期間（OQ-3） | **解決（Q4=a — D-4）**: 主 = Lambda Duration p95 > 500ms（5 分 × 3、missing=notBreaching）、補助 = API GW Latency p99 > 1500ms。通知先 = SNS（Q5=a — D-5） | アラーム・SNS リソース定義 = infrastructure-design |
