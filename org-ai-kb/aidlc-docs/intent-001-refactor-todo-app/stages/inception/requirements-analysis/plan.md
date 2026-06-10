# Plan — requirements-analysis

> Stage: requirements-analysis / Owner: aidlc-product-manager-agent
> Output artifact: `requirements.md`（本ディレクトリ）
> Contributor: aidlc-systems-architect-agent / Reviewer: aidlc-product-lead-agent

## Artifact Resolution（入力の解決）

| 必要な知識 | 使用する成果物 | 備考 |
|---|---|---|
| Intent（目的・スコープ） | `intent.md` + 人間確認済みの目的（①品質・保守性 ②アーキテクチャ ③テスト・型安全 ④インフラ刷新） | brownfield-refactoring。新機能追加ではなく振る舞い保持が主軸 |
| 現状システムの事実 | RE 6 成果物（business-overview / architecture / code-structure / api-documentation / technology-stack / dependencies） | Observations（事実）と Proposals（判断材料）が分離済み。reviewer 判定 ready |
| 既存要件 | v1 `aidlc-docs/inception/requirements/requirements.md`（FR-001〜004 / NFR-001〜004 / Out of Scope） | ワークフロー合意 = validate-and-augment。v1 ID を保持して再構成 |
| ドリフト情報 | BO-O2 / BO-O3 / AR-O3 / AR-O4（v1 ドリフト 4 件、原本突合済み） | Q1 の回答で扱いを確定 |

フォールバックなし（必要な上流成果物はすべて存在する）。

## ID 体系（requirements.md で使用）

- **FR-001〜004 / NFR-001〜004**: v1 から継承（ID 不変）。各要件に検証結果（充足 / ドリフト / 未検証）を付記
- **RF-xx**: リファクタリング要件（本 intent の中核）。各 RF に受入基準・優先度（P0/P1/P2）・出典（RE の Observation/Proposal ID と関連 v1 要件 ID）を付与
- **NFR-005 以降**: Q3 の回答で新規追加する非機能要件（観測性・CI 等）
- **A-x / OOS-x**: 前提とスコープ外（v1 Out of Scope の継続項目を含む）

## Steps

- [x] 1. 入力の読込: intent.md / RE 6 成果物 / v1 requirements.md / reviewer review
- [x] 2. 判断点の洗い出しと `questions.md` の作成（Q1: ドリフト方針、Q2: 振る舞い変更許容範囲、Q3: 新規 NFR スコープ、Q4: 優先順位軸）
- [x] 3. 人間の回答をレビュー。明確なら続行、曖昧なら追加質問を questions.md に追記（status: further-clarification）— Q1=c / Q2=b / Q3=c（WAF 除外）/ Q4=c。全回答明確、追加質問なし
- [x] 4. v1 requirements.md の構造を本ステージへ写し取り、v2 テンプレート（Intent Summary / FR / NFR / Assumptions / Out of Scope）へ再構成。v1 の安定 ID（FR-001〜004 / NFR-001〜004）と Data Model / API Design の事実を保持
- [x] 5. v1 要件の検証（validate）: 各 FR/NFR を RE 成果物と突合し、充足状況とドリフト（BO-O2 / AR-O3 / AR-O4 等）を要件表に記録。Q1 回答に基づき「実装修正」か「仕様更新」かを各件で確定
- [x] 6. 振る舞い保持要件の明文化: BT-1〜BT-7（business-overview）を回帰保証の対象トランザクションとして固定し、受入基準（既存テスト 45 ケース + 追加検証手段）を定義 — BP-1 として明文化
- [x] 7. リファクタリング要件 RF-xx の起草（augment): Q2/Q3 回答でスコープ内となった RE Proposals（BO-P / AR-P / CS-P / API-P / TS-P / DEP-P）を要件化。各 RF に pass/fail 判定可能な受入基準を記述 — RF-01〜RF-22
- [x] 8. 優先順位付け: Q4 回答の軸で全 RF に P0/P1/P2 を割当て、根拠を 1 行で付記 — P0×3 / P1×10 / P2×9
- [x] 9. Assumptions / Out of Scope の確定: 認証なし（デモ用途）等の継続前提、Q2/Q3 でスコープ外とした項目（例: PATCH 化、WAF）を OOS として明記 — A-1〜A-7 / OOS-1〜OOS-10
- [x] 10. トレーサビリティ表の作成: RF-xx ↔ RE Observation/Proposal ID ↔ v1 要件 ID の対応表。採用しなかった Proposal も「不採用 + 理由」で記録し、判断の痕跡を残す — 不採用 9 件（一部採用含む）を理由付きで記録
- [x] 11. `requirements.md` を本ディレクトリに書き出し、自己チェック（テンプレート準拠 / 全 RF に出典と受入基準 / ID 欠番なし）— 確認済み: テンプレート 5 セクション準拠、RF-01〜22 欠番なし、全 RF に出典・受入基準あり
- [x] 12. `state/state.json` を更新: outputs に requirements.md を登録、status を `artifact-generated` に変更

## 品質基準（自己チェック項目）

- すべての要件が pass/fail で検証可能な受入基準を持つ（曖昧さの排除）
- すべての RF が出典（RE の ID）に遡れる — 根拠のない要件を作らない
- 「やらないこと」（Out of Scope）が「やること」と同じ精度で記述されている
- 振る舞い保持（BT-1〜BT-7 不変）が要件として明文化されている
