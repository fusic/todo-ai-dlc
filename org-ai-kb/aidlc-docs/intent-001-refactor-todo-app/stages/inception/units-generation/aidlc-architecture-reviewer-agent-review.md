# Final Review — units-generation / refactor-todo-app

> Reviewer: aidlc-architecture-reviewer-agent（final reviewer = 品質ゲート）
> Date: 2026-06-10
> 対象: `/stages/inception/units-generation/` の全ファイル（components.yaml / units.md / unit-dependencies.md / unit-story-map.md / questions.md / plan.md）
> 突合した上流・参照物: domain-design `components.yaml` / `components.md`、requirements-analysis `requirements.md`、RE `business-overview.md` / `dependencies.md`、`workflow.json`、stage definition + templates（units-generation）

## 判定

**ready**

ブロッカーなし。copy-forward の blueprint identity は機械的 diff で検証済み、人間の 3 決定（Q1=a/Q2=a/Q3=a）は成果物に正確に反映され、story map は 29 行全件カバレッジ・優先度フェーズとも原典一致、申し送り 8 件の仕分けは妥当、construction の 4 ステージが UNIT-001 を単位として作業可能な状態にある。

## 検査結果（観点別）

### 1. copy-forward の blueprint identity 保存 — PASS（diff で自己検証）

domain-design 版と units-generation 版の `components.yaml` を直接 diff した。差分は以下のみ:

- ヘッダコメントへの追記ブロック（「units-generation での追記（copy-forward — 2026-06-10）」5 行）
- 各 Component への `Unit: UNIT-001` 行の追加（CMP-001 / CMP-002 / CMP-003 の 3 箇所、コメント付き）

CMP Id・Name・Behaviour-summary・Responsibilities・Boundaries・Source（Requirements / Business-Transactions）・Dependency・Dependent-Component・Entities（ENT-001 の属性 6 件含む）はすべて不変。ステージ定義の出力規定「unit 所有参照の追加以外は変更しない」を満たす。

### 2. 人間の決定の反映 — PASS

- **Q1=a（単一ユニット）**: units.md の Unit Inventory が UNIT-001 todo-app 1 件、所有 = CMP-001/002/003。「採用しなかった分割」節で b 案（2 unit）/c 案（3 unit）の不採用根拠を記録しており、questions.md の Trade Offs（P0 の unit 跨ぎ・DEP-O1/O2 の build 依存残存・並列の受け手不在）と論旨が一致する。分割しない判断の明示的記録は教材 intent としても適切。
- **Q2=a（非コンポーネント帰属）**: units.md「非コンポーネント要素の帰属」節が components.md の 5 区分（IaC / CI / E2E / 開発環境 / 文書）を全件 UNIT-001 帰属で記録。担う RF の割付（IaC = RF-14/15/17 + RF-12/16 の IaC 側、CI = RF-01、E2E = RF-02、開発環境 = RF-18〜21、文書 = RF-22）は components.md の引き継ぎ表と一致。components.md が残した検討事項「依存更新の独立ユニット化も検討」にも明示回答している（単一 unit のため不要）。
- **Q3=a（フェーズ列）**: unit-story-map.md にフェーズ列（P0/P1/P2、BT 行は「保持（全フェーズ）」）が存在し、Per-Unit 表で P0 → P1 → P2 の実施順序ガイド（Q4=c の翻訳）を自己完結的に記述。unit 境界に時間軸を持ち込んでいない（Q3=b の却下理由と整合）。

### 3. story map のカバレッジ — PASS（29 行全件・原典一致を実測）

- **行数**: BT-1〜BT-7（7 行）+ RF-01〜RF-22（22 行）= 29 行、欠落・重複なし。
- **優先度フェーズ**: requirements.md の節構成と全件一致 — P0 = RF-01/02/03（3 件）、P1 = RF-04〜13（10 件）、P2 = RF-14〜22（9 件）。フェーズ別集計の記載も正しい。
- **着地（備考列）**: components.md の RF トレーサビリティ表と 22 件すべて一致（CMP-001 = RF-05/08/09/13、CMP-002 = RF-04/07/10/11、CMP-003 = RF-03、択一 = RF-06、CMP-002+IaC 共同 = RF-12/16、非コンポーネント単独 = RF-01/02/14/15/17/18/19/20/21/22）。Coverage Gaps 節の着地集計（4/4/1/1/2/10 = 22）は components.md の集計と文字どおり一致。
- **BT 行の保持方針**: requirements.md BP-1 の BT 別保持方針表（BT-2 = 保持 + RF-06/08 追加、BT-3 = インライン編集 UX 正、BT-6 = エンドポイント維持 + fetchTodo のみ削除、BT-7 = backend unit + E2E）と一致。
- **BP-1 許容変更の対応付け**: 変更 1 = RF-04〜07（Q2=b 承認 4 件: 不正 JSON 400 / エラー表示 / 一覧順 / 条件付き書込）、変更 2 = RF-08、変更 3 = RF-16、変更 4 = RF-07 複合ケース、変更 5 = RF-12 — requirements.md BP-1 の列挙 5 件と正確に対応。
- **NFR 検証責務（付記）**: NFR-005 = RF-10/11+15、NFR-006 = RF-01/02（shared 含む全 workspace）、NFR-007 = RF-19 + RF-01 audit — requirements.md の NFR Measure と一致。
- **Coverage Gaps**: 空。上記実測により「真に空」であることを確認した（転記漏れなし）。
- **story fallback**: stories.md 不在（story-generation は workflow.json で skip 済み）に対し、BT/RF を story 相当として使う fallback が plan.md と story map 冒頭の両方に記録されており、work method の Artifact Resolution（fallback の文書化）を満たす。BT/RF の ID・内容は原典（business-overview.md / requirements.md）から保存されている。

### 4. 申し送り 8 件の仕分け — PASS（components.md と全件突合）

units.md の仕分け表は components.md「下流への申し送り」8 件と 1:1 対応し、内容の改変・脱落なし。

- #1〜6, #8 の construction 委譲は委譲先ステージ（functional-design / nfr-design / infrastructure-design / code-generation）がいずれも workflow.json に実在し、委譲先の選定も関心の所在と整合（例: #4 audit 閾値 = CI ゲート設計 → nfr-design、#6 アラーム統計 → nfr-design / infrastructure-design）。
- #7（CMP-003 内部構成・ビルド形態）のみ「本ステージで unit 影響分を判断 + 残りを委譲」とし、units 観点の制約（CMP-003 を build 順序の先頭に置く）を unit-dependencies.md の Build Order に確定記録 — これは units-generation の管轄（束ね方への影響）に正しく限定された判断。domain-design refine（M-2）で付記された「RF-03 本文は frontend = 型と定数 import が既決」の注意も脱落なく引き継がれている。
- 単一 unit により 8 件すべてが unit 内で閉じる（unit 跨ぎの設計判断ゼロ）という主張は、着地表と矛盾しないことを確認した。

### 5. 下流適合性（construction 視点） — PASS

- **fan-out 単位**: UNIT-001 のみ → functional-design / nfr-design / infrastructure-design / code-generation は 1 周で回る。units.md / unit-dependencies.md が明記。
- **build 順序の引き継ぎ**: CMP-003（葉・workspace: 依存の先行解決）→ CMP-001/CMP-002（相互独立・並列可）→ IaC バンドル（DEP-O1: CMP-002 ソース直結バンドル / DEP-O2: CMP-001 dist 参照）の順序が unit-dependencies.md Build Order に明確。RE dependencies.md の DEP-O1/O2 の観測と整合し、RF-20（デプロイスクリプト化）との接続も記述済み。デプロイ順序の最終決定は infrastructure-design 管轄と境界明示。
- **検証ゲートの位置**: CI（RF-01: 5 種ジョブ + shared 含む全 workspace）と E2E（RF-02: BT-1〜5 + BT-7、docker-compose = A-7）の位置づけが requirements.md の受入基準と一致。code-generation はフェーズ列（P0 ゲート → P1 → P2）に従えばよい状態。
- **contract-design**: workflow.json で skip 済み。unit-dependencies.md の「unit 間契約の対象が存在しない」根拠はこの構成判断と矛盾せず、Integration Points に unit 内統合（CMP-001→CMP-002 HTTP、CMP-002→DynamoDB/CloudWatch Logs 外部依存）を文脈として残しており、functional-design の api-specification 作業に必要な参照が揃っている。
- **Boundaries**: OOS-1〜10 の除外が units.md Boundaries に反映され、requirements.md の Out of Scope と一致。

### 6. テンプレート・規約適合 — PASS

- 3 成果物ともテンプレートの最小構造（Unit Inventory / Unit Details、Dependency Matrix / Build Order / Parallelisation / Integration Points、Coverage Matrix / Per-Unit / Coverage Gaps）を保持。拡張（非コンポーネント帰属節・申し送り仕分け節・フェーズ列・unit 内 build 順序）と省略（UDEP 採番なし）にはすべて rationale が付いており、テンプレートの「omitted with rationale or extended as needed」規定に適合。
- plan.md は全ステップ [x]、fallback の記録あり。state.json の outputs には本ステージ 6 ファイルすべて登録済み。

## 指摘（非ブロッキング — 修正不要の観察記録）

1. **units-generation に contributor 不在**: ステージ定義は contributor として aidlc-product-manager-agent を挙げるが、workflow.json の構成では本ステージに contributors が割り当てられていない（contribution ファイルなしは構成どおりであり owner の欠落ではない）。story map の要件突合は本レビューで原典と直接照合し問題なしを確認した。
2. **BT 行の Coverage type「fully implemented」**: BT は実装対象ではなく保持対象のため意味論にやや無理があるが、フェーズ列「保持（全フェーズ）」と凡例・備考で意図は明確に補正されており、実害なし。
3. **DEP-O1 の言い換え**: 「IaC が CMP-002 ソースをバンドル（DEP-O1）」は RE 原文（相対パス参照結合、todo-stack.ts:33/182）の要約的言い換えだが、domain-design components.md から一貫した用法であり blueprint の解釈ドリフトには当たらない。

## 結論

本ステージの成果物は完全・一貫・追跡可能であり、construction フェーズへの引き継ぎとして **ready**。修正要求なし。
