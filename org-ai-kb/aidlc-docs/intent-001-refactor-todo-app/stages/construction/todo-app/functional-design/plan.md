# Plan — functional-design / unit: todo-app

> Stage: functional-design / Owner: aidlc-systems-architect-agent / 2026-06-10
> Reviewer: aidlc-architecture-reviewer-agent

## Artifact Resolution（入力の解決と fallback の記録 — work method 規約）

| 必要な知識 | 優先ソース | 実際に使用する成果物 | fallback 判断 |
|---|---|---|---|
| Unit 定義 | `units.md` | `stages/inception/units-generation/units.md`（UNIT-001） | fallback なし（存在） |
| Story 割当 | `unit-story-map.md` | `stages/inception/units-generation/unit-story-map.md`（BT 7 + RF 22 = 29 行） | story-generation 未実施。上流確立済みの fallback（BT-1〜7 / RF-01〜22 を story 相当とする）をそのまま継承し、ID を保存する |
| コンポーネント blueprint（copy-forward 必須） | contract-design 版 `components.yaml` | **units-generation 版 `components.yaml`** | contract-design は本 workflow に存在しない（単一 unit のため unit 間契約対象なし — units.md Boundaries に記録済み）。Artifact Resolution 規約に従い最新の units-generation 版を copy-forward する |
| Provider/consumer 境界の契約 | `contract-design/` の契約 | **RE `api-documentation.md` の System Contracts 表** | contract-design 不実施のため、既存システムの外部コントラクト（6 エンドポイント + 共通エラー応答）を boundary 事実として使用。BP-1 受入基準 3 もこの表を基準としており整合する |
| 要件 | `requirements.md` | `stages/inception/requirements-analysis/requirements.md`（refined 版） | fallback なし（存在） |

## 本ステージのスコープ境界

- **対象（機能設計の管轄）**: ENT-001 Todo のスキーマ詳細化、BT-1〜7 のワークフロー、業務ルール（検証・ID 生成・completed 初期化・タイムスタンプ・存在判定・順序保証・エラー隠蔽）、API 仕様（6 操作 + エラー意味論 + PUT 部分更新意味論の文書化 = RF-22② の v2 側）、および機能面に着地する RF: RF-03/04/05/06/07/08/09、RF-12・RF-16 の API 側振る舞い（403 の機能規則）
- **対象外（後続ステージへ）**: RF-01/02（CI・E2E の具体設計 → nfr-design）、RF-16 ローカル経路方式・Secret 可視性（申し送り #3 → nfr-design / infrastructure-design）、RF-01 audit 閾値（#4 → nfr-design）、RF-15 アラーム統計（#6 → nfr-design / infrastructure-design）、RF-14/15/17〜21（IaC・依存・開発基盤）、RF-22 の v1 文書更新（#8 → code-generation）。これらは api-specification.md の Open Questions / 各成果物の申し送りとして明示的に引き継ぐ
- **規律**: 成果物は technology-agnostic（コード・SQL・フレームワーク名なし）。既存実装由来の固有名は「現状事実の参照」としてのみ記録する。CMP / ENT / BT / RF / FR / NFR / BP の既存 ID と境界・依存方向を不変に保つ（blueprint identity 維持）

## Steps

- [x] **Step 0 — clarification**: questions.md の 5 問（申し送り #1/#2/#5/#7 の設計判断）への回答を得る。回答が曖昧なら follow-up を追記し `further-clarification` とする — 全 5 問回答済み（全問 a 採択、2026-06-10）。曖昧さなし、follow-up 不要と判断
- [x] **Step 1 — copy-forward `components.yaml`**: units-generation 版を本ステージへコピーし、CMP-001/002/003 の Id・Name・境界・依存方向を保存したまま、各コンポーネントへ entity 参照（ENT-xxx）・rule 参照（BR-xxx）・workflow/state-machine 参照・API 参照（API-xxx）を追記して拡張する
- [x] **Step 2 — copy-forward `unit.md`**: units.md の UNIT-001 定義をコピーし、本ステージ成果物への参照と境界の維持を追記する
- [x] **Step 3 — copy-forward `unit-story-map.md`**: units-generation 版をコピーし、各行（BT 7 + RF 22）へ機能カバレッジ参照（どの BR / API / workflow が当該 story を実現・保持するか。対象外 RF は委譲先ステージ）を追記する
- [x] **Step 4 — `entities.yaml`**: ENT-001 Todo の全 6 属性（id/title/description/completed/createdAt/updatedAt）を型・必須・一意・min/max・default・制約付きで詳細化。リレーションなし（単一エンティティ）を明記。Q1/Q4 の回答（順序保証・定数の単一ソース）を制約に反映
- [x] **Step 5 — `rules.yaml`**: 業務ルールを BR-001〜 で採番。最低限: title/description 検証（FR-001）、id サーバー生成（ULID）、completed=false 初期化、createdAt/updatedAt 付与・更新、部分更新意味論（空オブジェクト有効 — OOS-3）、存在しない id → 404、不正 JSON → 400（RF-04）、複合ケース（不正ボディ × 不存在 id）→ 400 優先（BP-1 許容変更 4）、一覧順序保証 + 第 2 キー決定性（RF-06、Q1 回答）、ミューテーション失敗のユーザー可視エラー（RF-05）、内部情報非開示の 500（SECURITY-09 維持）、意図経路外アクセス拒否 403（RF-16 機能面）。各ルールに trigger / logic / violation / source（RF/FR/BT）を付す
- [x] **Step 6 — `api-specification.md`**: 6 操作（POST/GET 一覧/GET 個別/PUT/DELETE/health）を API-001〜 で採番し、入出力スキーマ・エラー（400/404/500/403）・BR/ENT 参照・versioning（Q2=b 後方互換方針）を記述。PUT の部分更新意味論を仕様として明文化（RF-22② の v2 側）。BP-1 許容変更 5 件の反映箇所を明示。Open Questions に #3/#4/#6 の委譲を記録
- [x] **Step 7 — `functional-spec.md`**: mermaid ER 図（ENT-001 単体）、Todo の状態機械（未完了 ⇄ 完了、生成→削除）、BT-1〜7 のワークフロー（ステップ列で BR / API を参照）、Rules Summary 表を YAML から導出して作成
- [x] **Step 8 — 整合検証**: ①機能面 RF（RF-03〜09、RF-12/16 の API 側）と BT-1〜7 / FR-001〜004 がいずれかの BR / API / workflow に着地していること ②BP-1 許容変更 5 件がすべて成果物に反映されていること ③copy-forward 3 ファイルの ID・境界が原本と不変であること、をセルフチェックして plan.md に結果を記す
- [x] **Step 9 — 状態更新**: 全成果物を outputs に登録し、state.json の本ステージ status を `artifact-generated` に更新する

## 成果物（stage definition の宣言に対する選択）

| 成果物 | 作成 | 理由 |
|---|---|---|
| entities.yaml | する | ENT-001 の source of truth |
| rules.yaml | する | BR の source of truth |
| api-specification.md | する | 公開コントラクト 6 操作 + RF-22② の部分更新意味論文書化の置き場 |
| functional-spec.md | する | 人間可読ビュー（ER / 状態機械 / ワークフロー） |
| components.yaml | する（copy-forward 拡張） | 規約上の必須 copy-forward |
| unit.md | する（copy-forward 拡張） | unit 境界の保持 |
| unit-story-map.md | する（copy-forward 拡張） | 29 行のカバレッジ追跡を機能参照で強化 |

## Step 8 — 整合検証結果（2026-06-10 セルフチェック）

> 注記: Step 6 の「versioning（Q2=b 後方互換方針）」の Q2=b は requirements-analysis の決定（API コントラクト後方互換）を指す。
> 本ステージ questions.md の Q2（CORS）とは別番号であり、Q2=a（両方撤去）は api-specification.md 通信前提に反映した。

### ① 機能面 RF / BT / FR の着地確認 — **pass（宙に浮く項目なし）**

| 対象 | 着地先 |
|---|---|
| RF-03 | ENT-001 constraints / BR-001・BR-002（定数単一定義）/ BR-014（公開面 — Q4=a）。Q3=a・Q5=a は components.yaml CMP-003 Decisions |
| RF-04 | BR-008 / API-001・API-004 |
| RF-05 | BR-011 / WF-001・003・004・005 |
| RF-06 | BR-010 / API-002（Q1=a — CMP-002 確定、第 2 キー id 降順） |
| RF-07 | BR-007・BR-009 / API-004・API-005 |
| RF-08 | WF-002 ステップ 3 / ENT-001.createdAt |
| RF-09 | WF-006 / API-003 維持（CMP-001 消費面のみ削除） |
| RF-12 API 側 | api-specification.md 通信前提（Q2=a — CORS 0 箇所） |
| RF-16 API 側 | BR-013 / 全 API のエラー表（403）。残余は OQ-1 |
| RF-22② | API-004 + BR-006（部分更新意味論の v2 正式文書） |
| BT-1〜BT-7 | WF-001〜WF-007（1:1）+ SM-001 |
| FR-001〜FR-004 | FR-001 = BR-001〜005/API-001、FR-002 = BR-010/WF-002/RF-08、FR-003 = API-004/BR-006/SM-001、FR-004 = API-005/BR-007 |

### ② BP-1 許容変更 5 件の反映確認 — **pass（5/5）**

| 許容変更 | 反映箇所 |
|---|---|
| 1. Q2=b 承認 4 件（不正 JSON 400 / エラー表示 / 順序保証 / 条件付き書込） | BR-008 / BR-011 / BR-010 / BR-007 |
| 2. createdAt 表示（RF-08） | WF-002 / ENT-001.createdAt |
| 3. 直接アクセス 403（RF-16） | BR-013 / API 全操作のエラー表 |
| 4. 複合ケース 404→400（RF-07） | BR-009 / API-004 |
| 5. CORS ヘッダ消失（RF-12） | api-specification.md 通信前提 + Versioning 節（5 件と 1:1 対応を明記） |

### ③ copy-forward 3 ファイルの blueprint identity 確認 — **pass**

- `components.yaml`: CMP-001/002/003 の Id・Name・Unit・Behaviour-summary・Responsibilities・Boundaries・Source・Dependency・Dependent-Component・Entities（ENT-001 属性 6 件）は units-generation 版から不変。追加は各 Component の `Functional-Design-References` ブロックとヘッダ注記のみ
- `unit.md`: UNIT-001 の Inventory 行・Details 全項目を原本どおり保存。追加は「functional-design 成果物への参照」「申し送りの解決状況」の 2 節のみ
- `unit-story-map.md`: 29 行の Story/Unit/Coverage type/フェーズ/備考は不変。追加は「機能設計参照」列と追記注記 3 箇所のみ。Coverage Gaps は引き続き空

### 残課題（後続ステージへの委譲 — 成果物に明記済み）

- OQ-1: RF-16 ローカル経路方式・Secret 可視性 → nfr-design / infrastructure-design（申し送り #3）
- OQ-2: 依存監査 severity 閾値 → nfr-design（#4）
- OQ-3: アラーム統計・評価期間 → nfr-design / infrastructure-design（#6）
- RF-22①③ + v1 文書更新 → code-generation（#8）
