# Units of Work — refactor-todo-app

> Stage: units-generation / Owner: aidlc-app-architect-agent
> 構成決定: Q1=a（単一ユニット todo-app）/ Q2=a（非コンポーネント要素は専用 unit を作らず UNIT-001 に帰属）/ Q3=a（P0→P1→P2 は unit-story-map.md のフェーズ列で表現）— questions.md 回答済み・plan.md 承認済み（2026-06-10）。
> テンプレート拡張の rationale: templates/units.md の最小構造（Unit Inventory / Unit Details）に加え、domain-design `components.md` からの引き継ぎ義務を果たすため「非コンポーネント要素の帰属」「申し送り 8 件の仕分け」の 2 節を追加した。

## Unit Inventory

| Unit ID | Unit | Purpose | Packaging Assumption | Components Owned |
|---|---|---|---|---|
| UNIT-001 | todo-app | RF-01〜22 のリファクタリング全件を、BP-1（振る舞い保持）の単一検証ゲート（RF-01/02）の保護下で安全に実施するための、システム全体を束ねた開発・デプロイ単位 | 単一リポジトリ（pnpm monorepo — 本 intent 完了時 4 workspace パッケージ）+ 単一デプロイ束（IaC が全コンポーネントを同時デプロイ）。モジュラーモノリス相当 | CMP-001, CMP-002, CMP-003 |

## Unit Details

### todo-app

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

### 採用しなかった分割（判断の記録 — 教材価値としての明示）

- **2 ユニット案（application / platform）**: P0（RF-01/02 = platform 側、RF-03 = application 側）が unit を跨いで割れ、安全順序の管理が unit 横断になる。IaC の application への build 依存（DEP-O1/O2）も残るため、単独開発では並列化の利得なくオーバーヘッドのみ — 不採用。
- **3 ユニット案（frontend / backend+shared / infrastructure）**: 並列の受け手（複数チーム）が存在せず、CMP-003 変更が常に 2 unit へ波及する — 不採用。
- 根拠原則: 「Simpler decomposition is better until complexity justifies splitting further」。本システムには分割を正当化する複雑さ（複数チーム・独立デプロイ需要・スケール差）が存在しない。**分割しない判断を記録すること自体が AI-DLC 教材としての価値**（questions.md Q1 留意点）。

## 非コンポーネント要素の帰属（Q2=a — components.md 5 区分の全件引き継ぎ）

ビジネスロジックを持たない支援要素。専用 unit には昇格させず、すべて UNIT-001 に帰属させる（独立した変更レート・所有チームが現れたときに初めて分離を再検討する）。RF 単位のトレーサビリティは unit-story-map.md の行で担保する。

| 要素 | 実体（現状） | 担う RF | 帰属 unit | 帰属判断 |
|---|---|---|---|---|
| IaC | `@todo-ai-dlc/infrastructure`（CDK 単一スタック TodoStack） | RF-14 / RF-15 / RF-17、RF-12（corsPreflight 側）/ RF-16（ヘッダ付与・Secret 側） | UNIT-001 | CMP-002 ソース直結バンドル・CMP-001 dist 参照（DEP-O1/O2）の結合点であり、コンポーネントと同一 unit に置くことで RF-12/16 の共同着地が unit 内で完結する |
| CI | 現状不在（`.github/` なし。A-4: GitHub Actions 想定） | RF-01 | UNIT-001 | P0 の検証ゲート。全 workspace（CMP-003 含む）+ synth + audit を 1 ゲートに束ねる。全 RF の前提のため最初に着手（フェーズ P0） |
| E2E テスト | 現状不在（data-testid は全 UI 要素に付与済み） | RF-02 | UNIT-001 | docker-compose 環境で BT-1〜5 + BT-7 を検証し CI に組み込む。BP-1 の証明装置（フェーズ P0） |
| 開発環境 | docker-compose / Dockerfile.dev / .env.example / ルート scripts | RF-18 / RF-19 / RF-20 / RF-21 | UNIT-001 | 依存更新（RF-18/19）は全パッケージ横断だが、単一 unit のため独立ユニット化は不要（components.md の検討事項への回答）。デプロイ script（RF-20）はルート package.json に置く |
| 文書 | README / v1 aidlc-docs（application-design 等） | RF-22 | UNIT-001 | コード変更ゼロ・回帰リスクゼロ。関連変更と同時実施が望ましい（例: RF-22②〈PUT 部分更新意味論〉は RF-04/07 と同時期）— 実施時期の詳細は construction の計画に委ねる |

## 申し送り 8 件の仕分け（domain-design → units-generation）

components.md「下流への申し送り」8 件を、本ステージで判断した事項と construction へ委譲を継続する事項に仕分ける。単一 unit 構成（Q1=a）により、**8 件すべての帰属が UNIT-001 内で閉じる**（unit を跨ぐ設計判断は発生しない）。

| # | 申し送り | 仕分け | 本ステージの判断 / 委譲先 |
|---|---|---|---|
| 1 | RF-06 の実現箇所（CMP-001 か CMP-002 か）+ 第 2 ソートキー | **construction 委譲** | functional-design で決定。択一がどちらに転んでも両コンポーネントは同一 unit のため unit 帰属・story map は不変（本ステージで再判断不要であることを確認） |
| 2 | RF-12 の集約先（Hono 側 / API GW 側 / 両方撤去） | **construction 委譲** | functional-design / infrastructure-design で決定。共同着地（CMP-002 + IaC）は UNIT-001 内で完結するため unit 間整合確認は不要（Q2=a の利点が成立） |
| 3 | RF-16 のローカル経路方式 + Secret 可視性の扱い | **construction 委譲** | nfr-design / infrastructure-design で決定。E2E（RF-02、同一 unit 所有）がローカル経路の動作を pass/fail で検証する |
| 4 | RF-01 の pnpm audit 閾値 | **construction 委譲** | nfr-design（CI ゲート設計）で決定 |
| 5 | RF-03 のテストコード境界値リテラル | **construction 委譲** | functional-design で決定 |
| 6 | RF-15 のアラーム統計（p95 等）と評価期間 | **construction 委譲** | nfr-design / infrastructure-design で決定（NFR-001「コールドスタート除く 500ms」で誤報しないこと） |
| 7 | CMP-003 の内部構成（zod 依存範囲）・ビルド形態（tsc or ソース直接参照） | **本ステージで unit 影響分を判断 + 残りを construction 委譲** | **判断（units 観点）**: 単一 unit のため、ビルド形態の選択は unit 間契約・unit 境界・unit のビルド独立性に影響しない。units 観点の制約は「CMP-003 を unit 内 build 順序の先頭に置く」のみで、これを unit-dependencies.md の Build Order に確定記録した。**委譲（設計観点）**: ビルド形態の選択そのもの・zod 依存範囲（CS-P1 トレードオフ）は functional-design へ。RF-03 本文「frontend は型と定数を import」が既決である注意（schema import を選ぶ場合は要件著者と整合確認）も併せて引き継ぐ |
| 8 | RF-22① の更新対象（v1 application-design の TodoForm 記述） | **construction 委譲** | code-generation での RF-22 実装時に v1 文書を更新（本ステージの成果物は v2 blueprint であり v1 文書には触れない） |

仕分け集計: 本ステージで判断 = 1 件（#7 の unit 影響分）/ construction 委譲 = 7 件 + #7 の設計観点（実現内容の決定はすべて設計・実装ステージの管轄であり、本ステージの管轄は「束ね方」への影響判断のみ — ステージ境界の維持）。
