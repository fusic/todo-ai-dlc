# Unit Definition — todo-app (UNIT-001)

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
