# Reverse Engineering — Clarification Questions

> Stage: reverse-engineering / Owner: aidlc-systems-architect-agent
> 対象: `/Users/seike460/src/github.com/fusic/todo-ai-dlc` の `packages/` 配下（backend / frontend / infrastructure）

下見の結果、コードベースは小規模な pnpm monorepo（3 パッケージ・ソース約 35 ファイル）です。判断が必要な点のみ 3 問に絞りました。

### Q1: 生成する成果物セットはどれにしますか？

ステージ定義は最大 7 成果物（business-overview / architecture / code-structure / api-documentation / component-inventory / technology-stack / dependencies）を挙げていますが、3 パッケージの小規模 monorepo に全てが必要とは限りません。

a) フル 7 成果物 — ステージ定義の Outputs を全て生成する
b) 6 成果物 — `component-inventory.md` のみ省略（3 パッケージの一覧は `architecture.md` の Component Descriptions と完全に重複するため、省略理由を architecture.md に記載）
c) 統合 4 成果物 — architecture / code-structure / api-documentation / technology-stack に統合し、business-overview と dependencies はそれぞれ architecture と code-structure に吸収
d) その他（指定してください）

**Trade Offs:** a は下流ステージがどの成果物名を参照しても見つかる網羅性がある一方、3 パッケージのインベントリ表は architecture.md と完全重複し保守点が増える。c はファイル数最小だが、下流の requirements-analysis（Product Manager がオーナー）が business context を探す際に business-overview.md という標準名がないと参照しづらい。b は重複だけを除き、下流が期待する標準成果物名をほぼ維持できる。

**Recommendation:** b — 6 成果物。唯一の純粋な重複である component-inventory.md だけを省略し、business-overview.md は下流の requirements-analysis の主要入力になるため独立ファイルとして残す。

[Answer]: b — 6 成果物（component-inventory.md のみ省略）

### Q2: リファクタリング候補となる「所見」を成果物に含めますか？

下見の時点で、現状記述を超える観測事項がいくつか見えています（例: backend と frontend での `Todo` 型の重複定義、`findAll` の DynamoDB Scan 使用、API Gateway CORS `allowOrigins: ["*"]` と Hono `cors()` デフォルトの全許可、認証なし、zod v3 系など依存のバージョン状況）。

a) 含めない — 純粋に「何が存在するか」の記述に徹する（所見は requirements-analysis 以降の仕事）
b) 含める — 各成果物に「Observations（観測事項）」セクションを設け、事実として記録する（改善提案・設計判断は書かない）
c) 含めて提案まで書く — 観測に加えてリファクタリング推奨案も記述する

**Trade Offs:** a は RE の純度が高いが、brownfield-refactoring intent では下流が同じ解析をやり直すことになり非効率。c は RE ステージが設計判断を先取りしてしまい、requirements-analysis / domain-design の裁量を狭める。b は事実（コードの現状）の記録に留まるため RE の責務内であり、かつ下流の判断材料になる。

**Recommendation:** b — 観測事項を事実として各成果物に記録する。提案・設計判断は下流ステージに委ねる。

[Answer]: c — 観測事項に加えてリファクタリング推奨案も記述する（推奨 b ではなく c を人間が選択。brownfield-refactoring intent のため RE の提案を下流の判断材料として活用する意図）

### Q3: v1 設計成果物（`aidlc-docs/`）との突合をどこまで行いますか？

リポジトリには AI-DLC v1 の設計成果物（`aidlc-docs/inception/`、`aidlc-docs/construction/`）が残っており、コード中にも `SECURITY-03` 等の v1 要件 ID へのコメント参照があります。

a) 突合しない — コードのみを解析対象とし、v1 成果物は読まない
b) 用語・業務文脈の参照のみ — Business Dictionary や要件 ID（SECURITY-xx 等）の意味を v1 成果物から補完するが、ドリフト検証はしない
c) 軽量ドリフト確認込み — b に加え、解析中に気づいた「v1 設計とコードの乖離」を Observations として記録する（網羅的な突合監査はしない）

**Trade Offs:** a はコードが唯一の真実で純粋だが、コード中の SECURITY-xx 参照の意味が成果物で説明できなくなる。c は若干の追加読込コストがあるが、brownfield-refactoring では「設計意図と実装の乖離」自体が重要なインプットになる。網羅監査まで行うのは小規模アプリには過剰。

**Recommendation:** c — コードを真実のソースとしつつ、v1 成果物を文脈参照に使い、気づいた乖離のみ事実として記録する。

[Answer]: c — 軽量ドリフト確認込み

---

> **Plan 承認**: 人間は上記回答を踏まえた plan.md の実行を承認した（2026-06-09）。
