# Plan — units-generation / refactor-todo-app

> Stage: units-generation / Owner: aidlc-app-architect-agent
> 本 plan は questions.md（Q1〜Q3）の回答確定後に実行する。回答内容により unit 数・帰属が変わる箇所は「Q1/Q2/Q3 回答に従う」と明記した。回答が plan の前提を変える場合は本 plan を改訂してから着手する。

## 入力と Artifact Resolution（fallback の記録）

| 関心 | 使用 artifact | 備考 |
|---|---|---|
| コンポーネント（必須入力） | `/stages/inception/domain-design/components.yaml` | CMP-001/002/003・ENT-001。人間承認済み。unit 編成の対象 |
| 非コンポーネント要素・申し送り | `/stages/inception/domain-design/components.md` | 5 区分（IaC/CI/E2E/開発環境/文書）の引き継ぎ表 + 申し送り 8 件 |
| 要件・優先度 | `/stages/inception/requirements-analysis/requirements.md` | RF-01〜22（P0/P1/P2）、BP-1、NFR-001〜007、A-1〜A-7、OOS |
| 現状の結合実態 | RE 成果物（`architecture.md` / `dependencies.md` / `code-structure.md`） | pnpm monorepo 3 パッケージ、CDK 単一スタック、DEP-O1/O2（IaC が CMP-002 ソースをバンドル・CMP-001 dist を参照） |
| ストーリー | **stories.md は存在しない（fallback）** | story-generation 未実施のため、`business-overview.md` の **BT-1〜BT-7** と requirements.md の **RF-01〜RF-22** を story 相当として unit-story-map.md にマップする。blueprint identity（BT/RF の ID・内容）は原典から保存する |

## Steps

- [x] 1. **回答確認と構成確定**: questions.md の Q1（unit 構成）/ Q2（非コンポーネント RF 10 件の帰属）/ Q3（P0→P1→P2 の表現方法）の回答を読み、unit 数・UNIT ID 採番・帰属方針を確定する。曖昧なら follow-up を questions.md に追記して `further-clarification` に戻す
- [x] 2. **components.yaml の copy-forward**: domain-design の components.yaml を本ステージディレクトリへコピーし、各 Component に unit 所有参照（例: `Unit: UNIT-001`）**のみ**を追加する。CMP ID・Name・Behaviour-summary・Responsibilities・Boundaries・Source・Dependency・Dependent-Component・Entities（ENT-001 の属性 6 件含む）は一切変更しない。ヘッダコメントに units-generation での追記内容（unit 参照のみ）を記録する
- [x] 3. **units.md の生成**（templates/units.md 準拠）:
  - Unit Inventory: UNIT ID / 目的 / packaging assumption / 所有コンポーネント（Q1 回答に従う）
  - Unit Details: 各 unit の purpose / responsibilities / boundaries / packaging assumption（pnpm workspace + CDK 単一スタックという現状実態を尊重し、クラウド・ランタイム選定はしない）/ build independence / change rate
  - 非コンポーネント要素の帰属節: components.md の 5 区分（IaC/CI/E2E/開発環境/文書）の帰属先 unit を全件明示（Q2 回答に従う）
  - 申し送りの引き継ぎ節: components.md の申し送り 8 件のうち、本ステージで判断する事項（例: 申し送り 7 の CMP-003 ビルド形態が unit のビルド独立性に与える影響）と construction（functional-design / nfr-design / infrastructure-design）へ委譲を継続する事項を仕分けて記録
- [x] 4. **unit-dependencies.md の生成**(templates/unit-dependencies.md 準拠): 依存マトリクス（UDEP ID）/ build order / 並列化機会 / integration points。単一 unit 構成の場合は「unit 間依存なし」の根拠を明記したうえで、**unit 内の build 順序**（CMP-003 → CMP-001/CMP-002 → IaC バンドル＝DEP-O1/O2、CI/E2E ゲートの位置）を construction への引き継ぎとして記録する（テンプレートの省略は rationale 付きで行う）
- [x] 5. **unit-story-map.md の生成**（templates/unit-story-map.md 準拠、story fallback 適用）:
  - Coverage Matrix: BT-1〜BT-7（7 行）+ RF-01〜RF-22（22 行）の全 29 行を unit に対応付ける。RF-06（CMP-001/002 択一・設計委譲）と RF-12/16（CMP-002 + IaC 共同着地）は備考で着地の未決・分担を保存する
  - 優先度フェーズの表現: Q3 回答に従う（推奨案なら P0/P1/P2 フェーズ列を追加し、construction 内の実施順序ガイドとして明記）
  - BP-1（振る舞い保持）と NFR-005〜007 の検証責務がどの unit のどの RF で担保されるかを付記する
  - Coverage Gaps: 空であることを確認して明示する（components.md の着地集計で全 22 件着地済みのため、空にならない場合は転記誤り）
- [x] 6. **セルフチェック**:
  - copy-forward 差分検証: 本ステージの components.yaml と domain-design 版の diff が unit 参照の追加のみであること
  - カバレッジ検証: RF 22 件 + BT 7 件が unit-story-map.md に全件登場すること（漏れゼロ）
  - 整合検証: units.md の所有コンポーネント ⇄ components.yaml の unit 参照 ⇄ unit-dependencies.md の UDEP が相互に矛盾しないこと
  - テンプレート逸脱（節の省略・拡張）にはすべて rationale が付いていること
- [x] 7. **state.json の更新**: units-generation エントリの status を `artifact-generated` にし、outputs へ `components.yaml` / `units.md` / `unit-dependencies.md` / `unit-story-map.md` を登録、`updated` を更新する（他ステージのエントリは変更しない）

## 本ステージで決めないこと（境界の明示）

- デプロイ順序の最終決定・クラウドリソース構成 → construction の infrastructure-design の管轄（本ステージは build order と integration points まで）
- RF-06 の実現箇所（API かフロントか）、RF-12 の集約先、RF-16 のローカル経路方式、RF-15 のアラーム統計、RF-01 の audit 閾値 → 設計委譲（components.md 申し送り 1〜6 を units.md で継続させる）
- unit 間 API コントラクトの詳細 → contract-design の管轄（unit 間依存が生じる構成の場合のみ）
