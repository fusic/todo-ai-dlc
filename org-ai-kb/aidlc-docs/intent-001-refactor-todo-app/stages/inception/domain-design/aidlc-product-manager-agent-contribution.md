# Contribution — aidlc-product-manager-agent（domain-design）

> Stage: domain-design / Owner: aidlc-app-architect-agent / Contributor: aidlc-product-manager-agent（requirements.md 著者）
> 対象: `components.yaml` / `components.md`（questions.md / plan.md は文脈として参照）
> 観点: 要件との整合・ビジネス観点（RF-01〜22 / FR / NFR / BP-1 / BT-1〜7 / 設計委譲事項の原典照合）
> 日付: 2026-06-10

## 総評

requirements.md の著者として原典照合した結果、**blueprint は要件を高い精度で反映している**。RF 22 件のトレーサビリティは漏れゼロ・着地集計の算術も一致し、ENT-001 の属性・制約は FR-001 / Business Dictionary と完全一致、人間の決定（Q1=a / Q2=a / Q3=a）も正確に反映されている。指摘は中 2 件・低 2 件で、いずれも components.yaml の構造変更を要しない（components.md の付記表・申し送り文言の補正レベル）。

## 指摘事項

### M-1（中）: 「BP-1 / NFR の対応（付記）」表の NFR-003 行が requirements のトレーサビリティと不一致

components.md「BP-1 / NFR の対応（付記）」の NFR-003 行は「CMP-002（zod 検証・RF-10/12）+ 非コンポーネント（RF-14/16）」とあるが、requirements.md「RF ↔ RE ↔ v1 対応表」で v1 NFR-003 に紐づく RF は **RF-04 / RF-10 / RF-11 / RF-12 / RF-14 / RF-16 / RF-17** の 7 件である。付記表からは以下が欠落している:

- **RF-04**（不正 JSON 400 — NFR-003 入力検証）→ CMP-002
- **RF-11**（エラースタックのサーバーログ — NFR-003 SECURITY-09 両立）→ CMP-002（NFR-005 行には記載があるが NFR-003 行にない）
- **RF-17**（CDK deprecated 移行 — NFR-003 SECURITY-14）→ 非コンポーネント（IaC）

また、同行の振り分け表現が主表（RF トレーサビリティ表）と食い違う: RF-16 は主表どおり **CMP-002（ヘッダ検証）+ IaC** の共同着地、RF-12 も **CMP-002 + IaC** の共同着地だが、付記表では RF-16 が非コンポーネント側のみ・RF-12 が CMP-002 側のみに置かれている。主表が正（22 件全件正確）のため実害は限定的だが、付記表も置く以上は原典と一致させてほしい。下流が付記表だけを読むと NFR-003 の達成手段を取りこぼす。

**提案:** NFR-003 行を「CMP-002（RF-04/10/11 + RF-12/16 の API 側）+ 非コンポーネント IaC（RF-14/17 + RF-12/16 の IaC 側）」相当に修正。

### M-2（中）: 申し送り 7 の前半は RF-03 本文で既決と読める — 要件文言との整合注記が必要

「下流への申し送り」7 は「CMP-001 が zod に依存するか（schema ごと import）、型と定数のみ参照するか」を設計の未決事項として渡しているが、RF-03 の要件本文は「**backend は `z.infer` で型導出、frontend は型と定数を `workspace:` 依存で import する**」と既に規定しており、要件上 frontend のimport 対象は「型と定数」で既決と読める。CMP-001 の責務記述（「文字数の入力補助は…UX 目的であり、防衛線ではない」）自体はこの要件意図と正しく整合している。

RF-03 の受入基準（pass/fail）は「frontend / backend が shared へ `workspace:` 依存を持ち」までしか縛っていないため schema import を選んでも受入基準違反にはならないが、設計がそちらを選ぶ場合は要件本文との乖離（実装方式の記述からの逸脱）になる。

**提案:** 申し送り 7 に「RF-03 本文は frontend = 型と定数の import を規定済み。schema import を選ぶ場合は要件著者と整合確認（要件文言の更新を含む）を行うこと。frontend 側検証は防衛線にしない（強制点は CMP-002）という意図は維持すること」の 1 文を付記。CMP-003 のビルド形態（tsc or ソース直接参照）は真正の未決事項であり、そのまま委譲で問題ない。

### L-1（低）: BP-1 許容変更の参照が RF-07（許容変更 4）のみ

BP-1 は許容変更を 5 件列挙している（1: Q2=b の 4 件 / 2: RF-08 createdAt 表示 / 3: RF-16 直接アクセス 403 化 / 4: RF-07 複合ケース 400 / 5: RF-12 CORS ヘッダ変更）。components では RF-07 にのみ「BP-1 許容変更 4」の参照があり（CMP-002 Responsibilities・RF トレーサビリティ表の両方 — 正確）、RF-08 / RF-12 / RF-16 の各行には許容変更番号の参照がない。下流（units-generation・設計・テスト設計）が「この観測可能な振る舞い変更は承認済みか」を components 単体で判定できるよう、RF-08 行に「許容変更 2」、RF-12 行に「許容変更 5（A-1 根拠）」、RF-16 行に「許容変更 3」を備考付記すると BP-1 の回帰判定線が完結する。

### L-2（低）: NFR-001 の充足主体（CMP-002）が components 上で不可視

NFR-001（API 500ms、コールドスタート除く）は付記表で RF-15（非コンポーネント/IaC = 計測可能化）にのみ着地しており、**500ms を満たす主体が CMP-002 である**ことがどこにも現れない。本 intent は性能目標を変更しないため Source への追加は必須ではないが、付記表 NFR-001 行に「充足主体は CMP-002（RF-07 のアトミック化＝DynamoDB 呼出 2→1 回はレイテンシ改善に寄与）。計測装置は RF-15（IaC）」程度の一文があると、設計ステージが RF-15 のアラーム閾値（500ms 整合）を検討する際に対象コンポーネントを迷わない。

## 確認済み・問題なしの領域

1. **RF トレーサビリティ（主表）— 22/22 全件正確**: RF-01〜RF-22 の着地先を requirements.md の各 RF 本文・受入基準と 1 件ずつ照合し、全件一致を確認。着地集計（CMP-001=4 / CMP-002=4 / CMP-003=1 / 択一=1 / CMP-002+IaC=2 / 非コンポーネント=10、計 22）の算術も一致。RF-09 の「fetchTodo 削除は CMP-001 / `GET /api/todos/:id` 維持は CMP-002」の分離、RF-21 の「dev.ts PORT 環境変数化の CMP-002 開発用エントリへの軽微な波及」の注記も要件（Q2=b、OOS-4 整合）と正確に対応。
2. **ENT-001 Todo の属性・制約 — 原典完全一致**: id（ULID・サーバー生成・DynamoDB PK）/ title（必須 1〜200、zod CreateTodoSchema・UpdateTodoSchema）/ description（任意 ≤1000）/ completed（作成時 false 固定）/ createdAt・updatedAt（ISO 8601、サーバー付与・更新）の全 6 属性が FR-001〜003 の受入基準および business-overview.md Business Dictionary と一致。制約定数 200/1000 の単一ソース＝CMP-003、強制点＝CMP-002 の分離も RF-03 の意図どおり。
3. **人間の承認（Q1=a / Q2=a / Q3=a）の反映 — 正確**: 3 コンポーネント構成・backend 内層（routes→handlers→repositories）と frontend 内部構造の「境界ではない」明記（各 Boundaries）、ENT-001 所有の CMP-002 一意配置（CMP-003 は Entities: {} + 「所有しない」境界明記）、非コンポーネント要素節の設置と RF 対応表、すべて questions.md の回答と一致。
4. **BT-1〜BT-7 のカバレッジ — 過不足なし**: CMP-001 = BT-1〜5（操作面）、CMP-002 = BT-1〜7（API 面）の振り分けが requirements.md の BT 表（保持方針・検証手段）と一致。BT-2 への RF-06/RF-08 の追加振る舞い、BT-6 の「エンドポイント維持・クライアントのみ削除」、BT-7 の E2E アサーション（RF-02 = BT-1〜5 + BT-7）も正確。BP-1 が CMP-001 / CMP-002 双方の Source に登録され、検証装置（RF-01/02）の位置づけも要件と一致。
5. **下流への申し送り — requirements の設計委譲 5 件を全カバー**: requirements.md が「設計ステージで決定」と明記した RF-01（audit 閾値）/ RF-03（テストの境界値リテラル）/ RF-06（実現箇所 + 第 2 キー）/ RF-15（統計方法・評価期間）/ RF-16（ローカル経路方式 + Secret 可視性）がすべて申し送り 4/5/1/6/3 に着地。追加 3 件（申し送り 2: RF-12 集約先、7: CMP-003 内部構成 — M-2 の注記要、8: RF-22① 更新対象の整理）も要件と矛盾しない。欠落なし。
6. **Assumptions / OOS との整合**: E2E = docker-compose（A-7）、CI = GitHub Actions 想定（A-4）、デプロイトポロジー未決定（units-generation 管轄）の宣言、OOS 項目（PATCH 化・ページネーション・OpenAPI・zod v4 等）の components への非混入を確認。テスト境界の記述（CMP-002 = 21 ケース、Q1 トレードオフの 45 ケース）も BP-1 受入基準 1 の内訳（backend 21 / frontend 17 / infrastructure 7）と一致。
7. **components.yaml ⇄ components.md の 2 ビュー一致**: 依存方向（CMP-001→CMP-002 実行時 HTTP / CMP-001→CMP-003・CMP-002→CMP-003 ビルド時）と双方向逆参照（Dependent-Component）、外部依存（DynamoDB / CloudWatch Logs）の非コンポーネント扱い、Source の ID 群について、両ファイル間の食い違いは検出されなかった。

## 結論

M-1 / M-2 を refine で反映すれば、ビジネス・要件整合の観点で units-generation へ渡せる品質である。L-1 / L-2 は任意（推奨）。本 contribution による components.yaml / components.md の直接編集は行っていない。
