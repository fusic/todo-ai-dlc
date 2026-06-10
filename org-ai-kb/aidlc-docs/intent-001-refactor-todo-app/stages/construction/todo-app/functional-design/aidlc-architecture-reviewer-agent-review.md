# Final Review — functional-design / unit: todo-app (UNIT-001)

> Reviewer: aidlc-architecture-reviewer-agent / 2026-06-10
> 対象: 本ステージ全 9 ファイル（questions.md / plan.md / entities.yaml / rules.yaml / api-specification.md / functional-spec.md / components.yaml / unit.md / unit-story-map.md）
> 突合先: stage definition + templates、units.md / unit-dependencies.md / units-generation 版 components.yaml・unit-story-map.md、requirements.md（refined 版）、RE api-documentation.md、workflow.json / state.json、および **実コードベース**（packages/ 配下）

## Verdict: **ready**

ブロッキングな gap はない。低重要度の指摘 3 件（F-1〜F-3）と記録事項 2 件（F-4〜F-5）を下記に残す。いずれも後続ステージ（nfr-design / code-generation）が誤読しなければ実害がないレベルであり、修正イテレーションを要求しない。

---

## 1. 検証したこと（証跡）

### 1.1 コードベースとの突合（記述の正確性 — 額面で受け取らない検証）

| 成果物の主張 | 実コードでの確認結果 |
|---|---|
| 既存 45 テスト（backend 21 / frontend 17 / infrastructure 7）— unit-story-map BP-1 行 | **一致**。backend: todoHandler.test.ts 14 + todoRepository.test.ts 7 = 21 / frontend: App 3 + TodoList 3 + TodoItem 6 + TodoForm 5 = 17 / infrastructure: todo-stack.test.ts 7。計 45 |
| CORS 二重定義（Q2 の前提） | **一致**。`packages/backend/src/index.ts:10` の Hono `cors()` と `packages/infrastructure/lib/todo-stack.ts:63` の `corsPreflight` の 2 箇所が現存 |
| `fetchTodo` が frontend に現存（RF-09 / WF-006 の前提） | **一致**。`packages/frontend/src/api/todoApi.ts:22` |
| 200/1000 リテラルの重複（RF-03 / BR-001/002 の前提） | **一致**。backend `types/todo.ts`（zod `.max(200)`/`.max(1000)`）に加え、frontend `TodoForm.tsx:39,49` / `TodoItem.tsx:42,49` の `maxLength` にも散在 — 「単一定義 1 箇所」目標の前提事実が正しい |
| ULID 生成・`/api/health` → `{"status":"ok"}`・500 ボディ `{"error":"Internal server error"}` | **一致**。`todoHandler.ts:34`（ulid）、`index.ts:23`（health）、RE api-documentation.md 共通エラー表どおり |
| 現行 update は `findById` → 検証 → 書込（複合ケースは現状 404 が先勝ち） | **一致**。`todoHandler.ts` update/remove は findById 先行の 2 往復。BR-007/BR-009 が規定する「検証 → アトミック書込」への反転と、複合ケース 404→400 の変化が BP-1 許容変更 4 として承認済みであることも requirements.md L56 で確認 |

### 1.2 上流成果物との突合（blueprint identity / トレーサビリティ）

- **components.yaml copy-forward**: units-generation 版との diff を取得。差分は各 Component への `Functional-Design-References` ブロックとヘッダ注記のみ。CMP Id / Name / Unit / Behaviour-summary / Responsibilities / Boundaries / Source / Dependency / Dependent-Component / Entities（ENT-001 属性 6 件）は**完全不変** — pass
- **unit-story-map.md copy-forward**: diff で全 29 行の Story / Unit / Coverage type / フェーズ / 備考の不変を確認。追加は「機能設計参照」列と追記注記のみ。Coverage Gaps は引き続き空 — pass
- **unit.md copy-forward**: units.md UNIT-001 の Inventory 行・Details 全項目を原本どおり保存。追加 2 節のみ — pass
- **申し送り 8 件の仕分け整合**: units.md の #1/#2/#5/#7（設計観点）が questions.md Q1〜Q5 で解決され、#3/#4/#6 が api-specification.md OQ-1〜OQ-3、#8 が code-generation 委譲として全件追跡されている。宙に浮いた申し送りなし — pass
- **API 仕様 vs RE System Contracts**: 6 操作のメソッド / パス / ステータス / エラーボディ形状（`Validation failed` + details / `Todo not found` / `Internal server error`）が RE 表と一致し、差分は BP-1 許容変更 5 件（Versioning 節に列挙）に限定されている。BP-1 受入基準 3 と整合 — pass
- **BR/API/WF/ENT の相互参照**: BR-001〜014 の applies-to と API-001〜006 の Business rules 列、WF-001〜007 のステップ参照、Rules Summary 14 行を全件相互照合。参照切れ・宛先不存在なし。BT-1〜7 ⇄ WF-001〜007 は 1:1 + SM-001 — pass
- **機能面 RF の着地**: plan.md Step 8 ①の表を独立に再検証。RF-03/04/05/06/07/08/09、RF-12・RF-16 の API 側、RF-22② のすべてが BR / API / WF / ENT のいずれかに着地。FR-001〜004 も同様 — pass

### 1.3 規約・テンプレート・work method 準拠

- stage definition 宣言の 7 成果物すべて作成済み。plan.md の作成判断表と一致
- questions.md は question-format.md 準拠（選択肢 / Trade Offs / Recommendation / [Answer]、全 5 問回答済み）
- plan.md に Artifact Resolution 表あり: contract-design 不在（workflow.json で skip、単一 unit）の fallback として units-generation 版 components.yaml + RE System Contracts を使用と明記 — work method の「Document the fallback」準拠
- technology-agnostic 規律: 新規 4 成果物（entities / rules / api-spec / functional-spec)はコード・SQL・フレームワーク名なし（ULID / ISO 8601 / REST/JSON は形式仕様として宣言済み）。components.yaml 内の zod / DynamoDB 言及は copy-forward 原本由来であり本ステージの追記ではない — 許容
- state.json: 本ステージ outputs に 9 ファイル全件が規約形式で登録済み

## 2. Findings

### F-1（低 / traceability の字句）: unit-story-map の「Versioning 節の 1〜5 と 1:1 対応」は不正確

unit-story-map.md BP-1 行の functional-design 追記は「許容変更 5 件の v2 コントラクト上の着地は api-specification.md Versioning 節の 1〜5 と 1:1 対応」と述べるが、実際の対応は 1:1 ではない。Versioning 節の項目 1（不正 JSON 400）と 2（順序保証）はともに **BP-1 許容変更 1** の内訳であり、**BP-1 許容変更 2（createdAt 表示）は UI 変更のため Versioning 節に現れない**（正しい着地は WF-002 / ENT-001.createdAt — plan.md Step 8 ②の表は正確）。api-specification.md 自体は「本仕様で現行コントラクトから変わる点」と正しく述べており、誤っているのは story map 側の対応関係の要約のみ。**実害**: BP-1 監査時に「許容変更 2 が Versioning にない」ことを欠落と誤認する可能性。修正は任意（次回 touch 時に字句修正で足りる）。

### F-2（低 / スコープ表記の不整合）: RF-11 の「機能面 / 非機能面」ラベルが成果物間で揺れる

functional-spec.md Scope と plan.md スコープ境界は RF-11 を**非機能面（nfr-design 管轄）**に分類するが、rules.yaml BR-012 は source に RF-11 を持ち、unit-story-map.md の RF-11 行は委譲ではなく **BR-012 への着地**として記録している。実質は「500 の非開示＝機能規則（BR-012）/ スタックのログ出力＝観測性（nfr-design）」の分担であり設計自体は健全だが、Scope の文言だけ読むと RF-11 が本ステージ成果物に現れないはずに見える。**実害**: nfr-design owner が RF-11 を全部自分の管轄と誤読し BR-012 と二重定義する可能性。Scope 行に「RF-11 は 500 非開示の機能規則のみ BR-012 で先行確定」と一言あれば解消する。

### F-3（低 / OQ-1 の先取りに見える字句）: BR-013 logic の「ヘッダ値は構成物に平文で保持しない」

requirements.md RF-16 の確定済み保護目標は「リポジトリへの平文コミット防止まで」であり、synth テンプレート・Lambda 環境変数上の可視性は**設計ステージで定義**（= OQ-1 で nfr-design / infrastructure-design へ委譲中）。BR-013 の「構成物に平文で保持しない」という字句は、読み方によっては synth テンプレート可視性まで禁止したと先取りして見え、OQ-1 の決定余地と緊張する。同じルール内で OQ-1 委譲も明記されているため矛盾とまでは言えないが、**「平文コミット防止（要件確定）/ 構成物上の可視性（OQ-1 未決）」の区別**を BR-013 の字句に反映するのが安全。nfr-design 着手時にこの注記ごと解釈すれば実害はない。

### F-4（記録 / プロセス観察）: 本ステージに contributor 不在

stage definition は contributors に aidlc-product-manager-agent を挙げるが、本 intent の workflow.json は functional-design に contributor を構成していない（contribution ファイルなしは構成どおりで違反ではない）。BT/FR カバレッジというプロダクト観点は本レビューで独立検証済み（1.2 参照）であり gap は検出されなかった。記録として残す。

### F-5（記録 / 自己文書化済みの非標準）: ENT-001.source.stories に BT-7 を含む

BT-7（ヘルスチェック）はエンティティに触れない。entities.yaml 自身がインラインコメントで「unit の保持対象として参照のみ記録」と理由を明記しており、誤解リスクは低い。指摘のみ。

## 3. 特に良い点（後続ステージへの引き継ぎ品質）

- 設計判断 Q1〜Q5 がすべて「どの BR / どの成果物に着地したか」まで追跡可能（functional-spec.md 設計決定表）。隠れた決定がない
- BR-009（複合ケース 400 優先）に「条件付き書込で処理順序が反転するため」という**因果**まで記録されており、code-generation が理由を再発見する必要がない
- requirements の Q2 と本ステージ questions.md の Q2 の番号衝突に plan.md が注記で先回りしている（誤読対策として的確）
- 委譲（OQ-1〜3 / RF-22①③）がすべて「委譲先ステージ + 根拠の申し送り番号」付きで、nfr-design が questions を立てる材料が揃っている

## 4. 結論

- **completeness**: 宣言成果物 7/7。29 story 行すべてが着地または委譲を持ち、Coverage Gaps 空 — pass
- **coherence**: BR/API/WF/ENT/SM の相互参照に切れなし。コードベース・RE・requirements との事実不一致なし — pass（F-1〜F-3 は字句レベル）
- **traceability**: copy-forward 3 ファイルの blueprint identity を diff で確認、ID・境界・依存方向は不変 — pass

**verdict: ready** — F-1〜F-3 は次に該当ファイルへ触れる際の軽微修正で足り、nfr-design への進行を妨げない。
