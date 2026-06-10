# Clarification Questions — domain-design

> Stage: domain-design / Owner: aidlc-app-architect-agent
> 入力: requirements.md（承認済み、RF-01〜22 / BP-1）、RE 成果物 6 点（architecture / code-structure / business-overview / dependencies / api-documentation / technology-stack）
>
> 本 intent は brownfield-refactoring（振る舞い保持 BP-1 が主軸）であるため、コンポーネント分割の基本線は「現状の論理構造を正とした再記述 + RF が要求する構造変化（RF-03 shared 新設）の反映」と置いています。以下の 3 点のみ、blueprint の骨格を左右するため人間の判断を仰ぎます。

### Q1: コンポーネントの粒度 — 現状の論理境界を正とするか、再編するか（Q1 of 3）

a) **現状境界の保持 + RF-03 反映**: `frontend SPA` / `backend API` / `shared コントラクト`（新設）の 3 論理コンポーネント。backend 内の routes/handlers/repositories はコンポーネント内部の実装構造として Boundaries/Behaviour に記録する
b) **層の昇格**: backend の routes / handlers / repositories をそれぞれ独立コンポーネントに昇格させる（5〜6 コンポーネント）
c) **ドメイン中心再編**: 「Todo 管理」を frontend/backend 横断の単一ドメインコンポーネントとして再定義する
d) Other

**Trade Offs:** (a) は既存のコード境界・テスト境界（45 ケース）・RE 観測との対応がそのまま保たれ、BP-1 の回帰判定が最も追跡しやすい。units-generation での自由度も失わない。(b) は技術層の分割であり「境界は責務に従う（技術層に従わない）」という設計原則に反するうえ、層単位の entity 所有が定義できない。(c) は論理的には美しいが、実装・デプロイの現実（HTTP 境界で分断された SPA と API）と乖離した blueprint になり、リファクタリング intent の「現状を正とする」方針と衝突する。

**Recommendation:** **a**。本 intent は振る舞い保持が主軸であり、要件が要求する構造変化は RF-03（shared 新設）のみ。境界変更を要件の要求範囲に限定するのがリスク最小で、RF ↔ コンポーネントのトレーサビリティも最も素直に張れる。

[Answer]: a — 現状境界保持 + RF-03 反映（frontend / backend / shared の 3 コンポーネント、backend 内の層は内部構造扱い）

### Q2: shared コントラクトの位置づけと Todo エンティティの所有者（Q2 of 3）

a) **shared をコンポーネントとして登録し、Todo エンティティの所有は backend に置く**: backend がライフサイクル（ULID 生成・completed 初期化・タイムスタンプ・永続化）の唯一の強制点として Todo を所有。shared は「コントラクト定義」（型・zod schema・制約定数 200/1000）を所有する entity なしコンポーネント（または契約物のみ所有）として登録
b) **shared に Todo エンティティの所有を移す**: 型定義の置き場所＝所有者とみなし、shared が ENT として Todo を持つ
c) **shared はコンポーネントにしない**: backend / frontend の依存ライブラリとして Dependency 欄にのみ記述する
d) Other

**Trade Offs:** 「すべてのエンティティに所有者は 1 つ」の原則上、所有を定義ファイルの所在（shared）に置くか、ライフサイクルの強制点（backend）に置くかの選択。(a) は「定義の共有」と「振る舞いの所有」を分離でき、業務ルールの強制点が backend であるという RE の事実（business-overview.md）と一致する。(b) は定義と所有が一致して単純だが、ライフサイクルを持たないパッケージがエンティティを「所有」する形になり、units-generation や API 設計で所有者に振る舞いを問えなくなる。(c) は最も簡素だが、RF-03 が P0 要件として要求する構造変化が blueprint 上で不可視になり、要件→コンポーネントのトレースが切れる。

**Recommendation:** **a**。Todo の振る舞い（生成規則・検証・永続化）の所有は backend、コントラクト（形状・制約値）の単一ソースは shared、という分離が RF-03 の意図（乖離の構造的排除）と entity 所有一意性の両方を満たす。

[Answer]: a — shared をコンポーネント登録しコントラクト定義の単一ソースに。Todo エンティティのライフサイクル所有は backend

### Q3: コンポーネント外要素（IaC・CI・E2E・開発環境・文書）の扱い（Q3 of 3）

RF 22 件中、RF-01/02（CI・E2E）、RF-14〜17（IaC）、RF-18〜21（依存・デプロイ・ローカル環境）、RF-22（文書）はビジネスロジック・エンティティを持たず、ステージ定義上のコンポーネント（書くコードの論理ブロック）に該当しません。

a) **components.md に「非コンポーネント要素」節を設けて記録**: カタログ（components.yaml）はビジネスロジックを持つコンポーネントのみとし、IaC / CI / E2E / 開発環境 / 文書は components.md の専用節で RF 対応表とともに明示し、units-generation へ引き継ぐ
b) **「インフラ・開発基盤」を便宜的に 1 コンポーネントとして components.yaml に登録**: RF-14〜21 のトレース先を yaml 内に確保する
c) **domain-design では扱わない**: コンポーネント 3 件のみ記述し、残りは units-generation に全面委任する
d) Other

**Trade Offs:** (a) はステージ定義（コンポーネント＝ビジネスロジックを持つソフトウェア）に忠実なまま、RF 22 件全件のトレーサビリティを domain-design 成果物内で完結できる。(b) は yaml の機械可読性の中に異質なエントリ（entity なし・behaviour なし）が混入し、カタログの意味論を弱める。(c) は RF-01/02/14〜22 の 11 件がこのステージの成果物から消え、units-generation が requirements.md まで遡る必要が生じる（引き継ぎの断絶リスク）。

**Recommendation:** **a**。ステージ定義の純度（コンポーネントの定義）と全 RF のトレーサビリティを両立する。units-generation はこの節を入力にユニット編成（CI/E2E をどのユニットに載せるか等）を決められる。

[Answer]: a — components.md に「非コンポーネント要素」節を設け RF 対応表とともに記録し units-generation へ引き継ぐ

---

> **Plan 承認**: 人間は Q1〜Q3 の回答とともに plan.md の実行を承認した（2026-06-10）。
