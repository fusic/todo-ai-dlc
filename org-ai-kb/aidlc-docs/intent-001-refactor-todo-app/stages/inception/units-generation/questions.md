# Questions — units-generation / refactor-todo-app

> Stage: units-generation / Owner: aidlc-app-architect-agent
> 目的: 承認済みコンポーネント（CMP-001 Frontend / CMP-002 Backend API / CMP-003 Shared Contract）は変えずに、「開発・デプロイのための束ね方（unit）」を決める。この unit 分割が construction フェーズ（functional-design / nfr-design / infrastructure-design / code-generation）の fan-out 単位になる。
> 前提となる人間の制約: 単独〜少人数開発 / 教材リポジトリ / P0（セーフティネット）→ P1（実装品質）→ P2（基盤）の安全な改修順序（Q4=c）/ 現状は pnpm monorepo + CDK 単一スタックで全コンポーネントが同時デプロイされる実態。
> 全 3 問。回答は各設問の `[Answer]:` に記入してください。

### Q1: unit 構成（中心の問い） — 3 コンポーネント + 非コンポーネント要素を、いくつの unit に束ねますか？

a) **単一ユニット** — todo-app 全体（CMP-001/002/003 + IaC/CI/E2E/開発環境/文書）を 1 unit とし、construction を 1 周で回す
b) **2 ユニット** — application（CMP-001/002/003）と platform（IaC/CI/E2E/開発環境/文書/依存管理）に分ける
c) **3 ユニット** — frontend（CMP-001）/ backend+shared（CMP-002/003）/ infrastructure（IaC + 非コンポーネント要素）に分ける
d) その他（自由記述）

**Trade Offs:**
- **a 単一ユニット**: construction の周回・state 管理が最小で、単独開発・小規模（コンポーネント 3 件 / RF 22 件 / 既存 45 テスト）に釣り合う。CDK 単一スタックが CMP-002 のソースを直接バンドルし CMP-001 の dist を参照する結合実態（DEP-O1/O2）とも一致し、unit 間コントラクト定義が一切不要。弱点は、construction 1 周の作業量が最大になること（ただし P0→P1→P2 の作業順序は unit 内で表現できる — Q3）。
- **b 2 ユニット**: 「アプリのコード」と「それを支える基盤」の関心分離は明確で、教材として unit 分割の概念を見せられる。しかし P0 の RF-01/02（CI/E2E）は platform 側、RF-03（shared 新設）は application 側に着地するため、**P0 が 2 unit に割れて安全順序の管理が unit を跨ぐ**。さらに IaC は application のビルド成果物に build 依存（DEP-O1/O2）するため、並列開発の利得が単独開発では発生しないまま、unit 間依存の管理コストと construction 2 周分のオーバーヘッドだけが残る。
- **c 3 ユニット**: チームが 3 つあれば fan-out の並列性が最大化される構成。だが本 intent は単独〜少人数であり並列の受け手がいない。CMP-003 は CMP-001/002 両方から参照される葉のため、3 分割すると shared の変更が常に 2 unit へ波及し、unit 間の build 順序（shared → frontend/backend → infra）の調整が construction の各ステージで必要になる。RF-06（CMP-001/002 択一）のような未決事項も unit を跨いだ設計判断になり、リファクタリング作業単位として最も重い。
- 共通の留意点: 教材として「unit 分割を見せる」価値を優先するなら b/c に教育的意義がある。一方 AI-DLC の原則は「複雑さが正当化するまで分割しない」であり、分割しない判断を明示的に記録すること自体も教材価値になる。

**Recommendation:** **a) 単一ユニット**。根拠: ①ペルソナ原則「Simpler decomposition is better until complexity justifies splitting」— 本システムは 3 コンポーネント・単一リポジトリ・単一スタック同時デプロイで、分割を正当化する複雑さ（複数チーム・独立デプロイ需要・スケール差）が存在しない。②本 intent はリファクタリングであり、unit = 「RF 22 件を安全に実施する作業単位」。P0 の検証ゲート（RF-01/02/03）は全変更の前提なので、すべての RF が同一 unit 内で P0 ゲートに保護される構成が最も安全。③unit を割ると construction の fan-out 周回数と unit 間コントラクト管理が増えるが、単独開発では並列化の利得がゼロ。順序の表現は Q3 の作業フェーズで担保する。

[Answer]: a — 単一ユニット（todo-app 全体を 1 unit、construction 1 周）

### Q2: 非コンポーネント RF 10 件（RF-01/02/14/15/17/18/19/20/21/22 — CI / E2E / IaC / 依存管理 / 開発環境 / 文書）の帰属はどうしますか？

a) **専用 unit は作らず、Q1 で選んだ unit 構成に帰属させる** — 単一 unit 案ならすべて UNIT-001 に帰属。unit-story-map.md で RF 1 件ごとに帰属を明示しトレーサビリティを担保する
b) **非コンポーネント要素を独立の platform unit に必ず分離する**（Q1 が a でも結果として 2 unit になる）
c) **検証ゲート（RF-01/02、P0）のみ最初の unit に同居させ、IaC・依存管理・文書（RF-14〜22）を別 unit にする**
d) その他（自由記述）

**Trade Offs:**
- **a**: unit 数が増えず、RF-12/16 のように CMP-002 と IaC の**両側に着地する共同 RF** を 1 unit 内で完結して設計・実装できる（unit を跨ぐ整合確認が不要）。帰属の明示は unit-story-map の行単位で行うため、トレーサビリティは失われない。
- **b**: IaC/CI の関心分離は綺麗だが、IaC は CMP-002 ソースバンドル・CMP-001 dist 参照の結合点（DEP-O1/O2）のため application 側への build 依存が必ず残る。また RF-12/16 の共同着地が unit を跨ぎ、construction で 2 unit の成果物間の契約整合を毎回確認する必要が生じる。
- **c**: 「P0 を最初に」という時間順序を unit 境界に翻訳した案。順序要求には即するが、unit が「束ね方」ではなく「実施時期」の箱になり、IaC 関連 RF が CI（platform 的関心）と分断される。時間軸の表現は Q3 のフェーズ列で足りる。

**Recommendation:** **a) 専用 unit を作らない**。非コンポーネント要素はビジネスロジックを持たない支援要素であり、それ自体を unit（= 開発・デプロイの独立した束）に昇格させる必要性は、独立した変更レート・所有チームが現れたときに初めて生じる。本 intent では RF-12/16 の共同着地を unit 内で閉じられる利点が大きい。components.md の引き継ぎ表（5 区分）は units.md の「非コンポーネント要素の帰属」節として全件記録する。

[Answer]: a — 専用 unit を作らず単一 unit に帰属（story map で RF 単位トレース）

### Q3: P0 → P1 → P2 の安全な改修順序（Q4=c）は、unit 成果物上どう表現しますか？

a) **unit-story-map.md に優先度フェーズ列（P0/P1/P2）を設け、construction 内の実施順序ガイドとして明記する**（unit は分けない）
b) **フェーズごとに unit を分ける**（P0 unit → P1 unit → P2 unit の 3 unit）— construction をフェーズごとに 1 周ずつ計 3 周回す
c) **unit 成果物では順序を扱わない** — 優先度は requirements.md にあるため、construction 側が都度参照する

**Trade Offs:**
- **a**: unit の純度（束ね方の定義）を保ったまま、作業順序を unit 成果物に自己完結的に保存できる。construction の code-generation はフェーズ列を見て P0 → P1 → P2 の順に実装すればよい。
- **b**: フェーズ完了を stage 状態として追跡できる反面、CMP-002 は P1（RF-04/07/10/11 等）と P2（RF-16 の API 側）の両方に登場するため**同一コンポーネントが複数 unit に所有され、所有一意性が崩れる**。unit は「開発・デプロイの束」であって時間軸の箱ではなく、ステージ定義の意図から外れる。
- **c**: 成果物の自己完結性を失う。construction の fan-out 時に毎回 requirements.md まで遡る必要があり、unit-story-map が「どの unit が何をいつ実装するか」に答えられなくなる。

**Recommendation:** **a) フェーズ列で表現**。順序は「束ね方」ではなく「作業計画」なので、unit 境界ではなく story map の属性として持つのが正しい置き場所。BP-1（振る舞い保持）の検証装置である RF-01/02 が P0 フェーズ先頭に明示され、以降の全 RF 行が「P0 ゲート確立後に実施」と読める形にする。

[Answer]: a — unit-story-map に優先度フェーズ列を設け construction の実施順序ガイドにする

---

> **Plan 承認**: 人間は Q1〜Q3 の回答とともに plan.md の実行を承認した（2026-06-10）。
