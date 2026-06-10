# Requirements — refactor-todo-app

> Stage: requirements-analysis / Owner: aidlc-product-manager-agent
> 方式: validate-and-augment — v1 要件（FR-001〜004 / NFR-001〜004、ID 継承）を RE 成果物と突合して検証し、リファクタリング要件（RF-xx）で補強する。
> 入力: intent.md、RE 6 成果物（business-overview / architecture / code-structure / api-documentation / technology-stack / dependencies）、v1 `aidlc-docs/inception/requirements/requirements.md`、questions.md（Q1〜Q4 回答済み）

## Intent Summary

- **Type:** refactor（振る舞い保持を主軸とした品質・保守性・アーキテクチャ・テスト・インフラの改善）
- **Scope:** system-wide（frontend / backend / infrastructure の 3 パッケージ + ルート開発環境 + CI 新設。RF-03 で `@todo-ai-dlc/shared` を新設するため、本 intent 完了時の workspace は 4 パッケージとなる）
- **Classification:** brownfield
- **Affected repos:** `fusic/todo-ai-dlc`（単一リポジトリ、pnpm monorepo）

確認済みの目的: ①コード品質・保守性 ②アーキテクチャ改善 ③テスト・型安全強化 ④インフラ含む全面刷新。新機能追加は行わない。

## 人間の決定事項（Q1〜Q4 — 2026-06-10 回答）

| # | 論点 | 決定 | 本書への反映 |
|---|---|---|---|
| Q1 | v1 ドリフト 4 件の扱い | **c: 件別判断** — BO-O2 実装修正 / BO-O3 ドキュメント更新 / AR-O3 実装修正 / AR-O4 実装修正 | RF-08（createdAt 表示）、RF-22（設計記述更新）、RF-14（IAM 最小権限）、RF-10（構造化ログ） |
| Q2 | 振る舞い変更の許容範囲 | **b: API コントラクト後方互換の範囲で不具合素地も修正** — 不正 JSON→400、ミューテーションエラー表示、一覧順保証、条件付き書込。未使用コード削除はフロント `fetchTodo` のみ、エンドポイントは維持 | RF-04〜07、RF-09。PATCH 化・エンドポイント削除・ページネーションは OOS-3〜5 |
| Q3 | 新規 NFR のスコープ | **c: 本格強化（WAF 除外）** — 構造化ログ + スタックログ + アラーム + CI ゲート + IAM 最小権限 + E2E スモーク + 直接アクセス対策（CloudFront カスタムヘッダ検証の軽量実装）+ Renovate。認証は OOS 継続 | RF-01/02/10/11/14/15/16/19、NFR-005〜007。WAF は OOS-2 |
| Q4 | 優先順位付けの軸 | **c: 安全な改修順序** — P0 = 検証ゲート + コントラクト一元化、P1 = backend/frontend 実装品質、P2 = インフラ刷新・依存・開発基盤 | 全 RF の優先度割当（§リファクタリング要件） |

## v1 要件の検証結果（validate サマリー）

| v1 ID | 検証結果 | 根拠（RE） | 処置 |
|---|---|---|---|
| FR-001 | **充足** | BT-1 実装済み（zod 検証・ULID・タイムスタンプ自動付与） | 変更なし（回帰保証対象） |
| FR-002 | **ドリフト** | BO-O2: createdAt が UI 未表示。BO-O5: 表示順の保証なし（要件にも定めなし） | Q1=c → 実装修正（RF-08）。表示順を要件に追記（RF-06） |
| FR-003 | **充足** | BT-3/BT-4 実装済み。PUT は部分更新意味論（API-O1）だが外部振る舞いは要件どおり | 変更なし。部分更新意味論を文書化（RF-22） |
| FR-004 | **充足** | BT-5 実装済み | 変更なし（回帰保証対象） |
| NFR-001 | **未検証** | TS-O6: 500ms を計測する仕組み（メトリクス/アラーム）が存在しない | API 500ms 側を計測可能化（RF-15）。フロント初回ロード 3 秒側は本 intent では計測対象外（OOS-9 と整合） |
| NFR-002 | **充足** | 全マネージドサービス構成（VPC なし） | 変更なし |
| NFR-003 | **部分充足 + ドリフト** | 認証なしは設計どおり（BO-O1）。入力検証は充足（zod / SECURITY-05）。CORS は機能するが二重定義（AR-O1）。SECURITY-03 構造化ログ未実装（AR-O4 ドリフト）。IAM が v1 設計より広い（AR-O3 ドリフト）。execute-api 直接アクセス可（AR-O2） | Q1=c / Q3=c → 実装修正（RF-10/12/14/16） |
| NFR-004 | **部分充足** | strict mode / Biome / Vitest / pnpm monorepo は充足（TS-O4）。CI 不在（CS-O5）、E2E 不在（CS-O4）、型の重複定義（CS-O1/O2）、build 二重出力（CS-O3） | 強化（RF-01/02/03/13） |

## Functional Requirements（v1 継承・検証済み）

| ID | Requirement | Acceptance Criteria | 検証結果 |
|---|---|---|---|
| FR-001 | ユーザーは TODO を作成できる。必須: title（1〜200 字）、任意: description（≤1000 字）。一意 ID（ULID）と作成/更新日時が自動付与される | `POST /api/todos` が有効入力で 201 + Todo を返し、無効入力で 400 + fieldErrors を返す。completed は false 初期化 | 充足 |
| FR-002 | ユーザーは全 TODO を一覧で確認できる。各アイテムにタイトル、完了状態、**作成日時**が表示される。**一覧は createdAt 降順（新しい順）で安定表示される**（本 intent で追記 — Q2=b） | `GET /api/todos` が 200 + 全件を返す。UI に title / completed / createdAt が表示される（RF-08）。リロード後も createdAt 降順が保たれる（RF-06）。0 件時は空状態メッセージ | ドリフト → 実装修正 |
| FR-003 | ユーザーは TODO の title / description を編集でき、完了状態を切り替えられる | `PUT /api/todos/:id` が 200 + 更新後 Todo（updatedAt 更新）を返し、存在しない id で 404、無効入力で 400。UI のインライン編集・チェックボックスで操作できる | 充足 |
| FR-004 | ユーザーは TODO を削除できる | `DELETE /api/todos/:id` が 204 を返し、存在しない id で 404。UI から削除でき一覧から消える | 充足 |

補足（外部コントラクトの維持対象）: `GET /api/todos/:id`（200/404）と `GET /api/health`（200）は UI 未使用だが公開エンドポイントとして維持する（Q2=b、OOS-4）。

## 振る舞い保持要件（回帰保証）

**BP-1: 本 intent の全変更は、BT-1〜BT-7 の外部から観測可能な振る舞いを保持しなければならない。** 許容される振る舞い変更は以下のみ:

1. Q2=b で承認された 4 件 — 不正 JSON→400 / ミューテーションエラー表示の追加 / 一覧順の保証 / 条件付き書込化
2. RF-08 — createdAt 表示の追加
3. RF-16 — CloudFront を経由しない直接アクセスの 403 化
4. RF-07 に伴う 400/404 優先順位の変更 — **不正ボディ かつ 存在しない id** の複合ケースに限り、応答が 404 から 400 に変わる（条件付き書込化で処理順序が「検証 → 書込」に反転するため）。400/404 とも既存コントラクトに定義済みのステータスであり、複合ケースの優先順位はコントラクト未規定のため、Q2=b（コントラクト後方互換の範囲）内の変更と判断する
5. RF-12 に伴う CORS レスポンスヘッダの変更・消失 — 既知クライアントは同梱 SPA のみで同一オリジン（A-1）のため、外部から観測可能な実影響はないと判断する

受入基準（pass/fail）:
1. 既存 45 テストケース（backend 21 / frontend 17 / infrastructure 7）が、承認済み変更に伴う最小限の更新を除き全件パスする
2. E2E スモークテスト（RF-02）で BT-1〜BT-5 が 1 周パスし、BT-7（`GET /api/health` 200）のアサーションがパスする
3. API コントラクト（api-documentation.md の System Contracts 表）のメソッド / パス / ステータスコード / レスポンス形状が、承認済み変更を除き不変である

| BT | トランザクション | 保持方針 | 検証手段 |
|---|---|---|---|
| BT-1 | TODO 作成 | 完全保持 | unit + E2E |
| BT-2 | TODO 一覧表示 | 保持 + 表示順保証（RF-06）と createdAt 表示（RF-08）を追加 | unit + E2E |
| BT-3 | TODO 編集 | 完全保持（インライン編集 UX を正とする — Q1 BO-O3） | unit + E2E |
| BT-4 | 完了状態の切替 | 完全保持 | unit + E2E |
| BT-5 | TODO 削除 | 完全保持 | unit + E2E |
| BT-6 | TODO 個別取得 | API エンドポイントは維持。フロント未使用クライアント `fetchTodo` のみ削除（RF-09） | backend unit |
| BT-7 | ヘルスチェック | 完全保持（CloudFront 経由。RF-16 後も `/api/health` は同一オリジンで到達可能） | backend unit + E2E |

## リファクタリング要件（RF-xx）

優先順位の軸（Q4=c）: **P0 = 壊していないことの証明手段を先に固める / P1 = 本体（backend・frontend）の実装品質 / P2 = 基盤（インフラ・依存・開発環境・文書）**。P0 完了後のすべての変更は P0 の検証ゲートに保護されて実施される。

### P0 — 検証ゲートとコントラクト一元化（他のすべての変更の前提）

| ID | 要件 | 受入基準（pass/fail） | 出典 | 優先度根拠 |
|---|---|---|---|---|
| RF-01 | CI 検証ゲートの導入: PR/push で lint（biome check）・型検査（全 workspace パッケージの `tsc --noEmit`）・テスト（全 workspace パッケージの `vitest run`）・`cdk synth`・`pnpm audit` を自動実行する。`pnpm audit` の severity 閾値（例: `--audit-level=high`）は、修正不能な上流 advisory で CI が恒常 fail しないよう設計ステージで決定する | CI 設定がリポジトリに存在し、上記 5 種のジョブがすべて定義され、いずれかの失敗で CI が fail になる。typecheck / test の対象に RF-03 の `@todo-ai-dlc/shared` を含む全 workspace パッケージが含まれる。main への変更が CI を経由する運用が README に明記される | CS-P3（CS-O5, CS-O8）、DEP-P3 の audit 部分（DEP-O5）／ v1 NFR-004 | 回帰検知の網がない状態で本体改修に入らないため最優先 |
| RF-02 | E2E スモークテストの導入: docker-compose 環境で BT-1〜BT-5 を 1 周する E2E テスト（Playwright 等）を追加し、CI に組み込む。BT-7（`GET /api/health` が 200）の 1 アサーションを含める（RF-16 等のミドルウェア変更による意図しない 403 化の回帰検知）。既存の data-testid を活用する | E2E テストが BT-1〜BT-5 の操作（作成→一覧→編集→トグル→削除）と BT-7（health 200）を検証してパスし、CI で実行される | CS-P4（CS-O4）／ v1 NFR-004 | モック境界で捕捉できない統合不具合（コントラクト乖離等）の検知＝振る舞い保持の証明装置 |
| RF-03 | 共有パッケージによるコントラクト一元化: `@todo-ai-dlc/shared` を新設し、`Todo`・入力型・zod schema・制約定数（200/1000）を一元化する。backend は `z.infer` で型導出、frontend は型と定数を `workspace:` 依存で import する | `Todo`/`CreateTodoInput`/`UpdateTodoInput` の定義がリポジトリ内に 1 箇所のみ。制約値 200/1000 のリテラルがプロダクションコード内では共有定数の 1 箇所のみ（テストコードの境界値リテラルの扱い — 許容するか共有定数から導出するか — は設計ステージで決定）。frontend / backend が shared へ `workspace:` 依存を持ち、既存テストが全件パスする | CS-P1 / DEP-P1 / BO-P5（CS-O1, CS-O2, BO-O6, DEP-O1）／ v1 NFR-004 | 型乖離はコンパイルで検出不能な回帰源。P1 の本体改修前に構造的に排除する |

### P1 — backend / frontend の実装品質

| ID | 要件 | 受入基準（pass/fail） | 出典 | 優先度根拠 |
|---|---|---|---|---|
| RF-04 | 不正 JSON ボディの 400 応答化: `POST /api/todos` と `PUT /api/todos/:id` で JSON パース失敗をクライアントエラーとして扱う | 不正 JSON ボディの送信で 500 ではなく 400 + エラー JSON が返るテストがパスする。有効入力の応答は不変 | API-P4（API-O8）／ v1 NFR-003（入力検証） | クライアント起因エラーの誤分類はエラー監視（RF-15）のノイズ源にもなる品質欠陥 |
| RF-05 | ミューテーション失敗時のエラー表示: create / 編集 / トグル / 削除 の API 失敗時にユーザーへエラーを表示し、未処理 rejection を解消する | 各ミューテーション失敗時に UI にエラーメッセージが表示されるテストがパスする。API 失敗をシミュレートしても未処理 Promise rejection が発生しない | API-P5（API-O9）／ v1 FR-001/003/004 | 失敗が無言で握り潰される現状は UX とデバッグ性の双方の欠陥 |
| RF-06 | 一覧表示順の保証: 一覧を createdAt 降順（新しい順）で安定表示する。同一 createdAt（ミリ秒一致）の tie は第 2 ソートキーで決定的に並べる（候補: id 降順 — ULID は辞書順＝時系列。FR-002 への追記要件。実現箇所＝API かフロントソートか、および第 2 キーの最終決定は設計ステージで行う） | リロード後・再取得後も一覧が createdAt 降順であることを検証するテストがパスする。同一 createdAt のアイテムが複数ある場合も順序が決定的である。新規作成直後の先頭表示という既存 UX が保たれる | BO-P4（BO-O5）、API-P2 の順序部分（API-O3）／ v1 FR-002 | 表示順不定は再現性のないユーザー体験で、E2E の安定性も損なう |
| RF-07 | 更新・削除のアトミック化: `findById` → 書込の 2 往復を、条件付き書込（`ConditionExpression: attribute_exists(id)`）に置き換える。404 セマンティクスは不変。ただし処理順序が「検証 → 書込」に反転するため、**不正ボディ かつ 存在しない id** の複合ケースは 400 を正とする（BP-1 許容変更 4） | 存在しない id への PUT が item を新規作成せず 404 を返すテストがパスする。不正ボディ かつ 存在しない id への PUT に 400 が返るテストがパスする。update / delete の DynamoDB 呼出が各 1 回になる。上記複合ケースを除き、既存の 200/204/404 応答が不変 | AR-P7 / API-P1（AR-O9, API-O2）／ v1 FR-003/004 | upsert 化し得る update は振る舞い保持に対する潜在バグ。レイテンシ・コストも改善 |
| RF-08 | 作成日時の UI 表示（FR-002 ドリフト解消）: TodoItem に createdAt を表示する | TodoItem に createdAt が人間可読形式で表示されるテストがパスする。FR-002 の表示要素（title / completed / createdAt）がすべて画面に存在する | BO-P1（BO-O2、Q1=c）／ v1 FR-002 | v1 要件を正とした件別判断（Q1）の実装側修正 |
| RF-09 | フロント未使用コードの削除: `todoApi.fetchTodo` を削除する。`GET /api/todos/:id` エンドポイントは維持する（BT-6 は API コントラクトとして存続） | frontend に `fetchTodo` が存在せず、frontend テストが全件パスする。backend の `GET /api/todos/:id` とそのテストは不変 | BO-P3 の一部（BO-O4、Q2=b）／ v1 API Design | デッドコードは保守対象を無駄に増やす。エンドポイント側は後方互換のため維持 |
| RF-10 | 構造化ログの導入（SECURITY-03 ドリフト解消）: backend のリクエストログを JSON 構造化ログに置き換え、コードコメントと実態を一致させる | Lambda / ローカルのリクエストログが JSON としてパース可能で、最低限 method / path / status を含む。SECURITY-03 を参照するコメントと実装が一致する | TS-P4（TS-O6, AR-O4、Q1=c）／ v1 NFR-003（SECURITY-03） | ドリフト解消（Q1）かつ NFR-005（観測性）の基礎 |
| RF-11 | エラースタックのサーバーログ出力: グローバルエラーハンドラで `err.stack` をサーバー側ログに出力する。クライアント応答は汎用メッセージ（500）を維持する | 未処理例外発生時にスタックトレースがサーバーログに記録されるテストがパスする。500 レスポンスボディは現行どおり `{"error": "Internal server error"}` のまま（SECURITY-09 維持） | AR-P3（AR-O5）／ v1 NFR-003（SECURITY-09 と両立） | 数行で調査可能性が大幅に向上。レスポンス非開示と両立する |
| RF-12 | CORS の一元化: API Gateway `corsPreflight` と Hono `cors()` の二重定義を解消し、設定を 1 箇所に集約する（本番経路は CloudFront 同一オリジンで CORS 不要という事実に基づく） | CORS 設定がリポジトリ内に高々 1 箇所（二重定義が解消されている。両方撤去＝0 箇所も可）。本番経路（CloudFront 同一オリジン）とローカル開発（Vite proxy）の両方で全 BT が動作する。CORS レスポンスヘッダの変更・消失は BP-1 許容変更 5（A-1 根拠）として扱う | AR-P1（AR-O1）／ v1 NFR-003（CORS 適切設定） | 二重定義は変更時の不整合リスク。意図の明確化 |
| RF-13 | frontend build の二重出力解消: build を `vite build` のみにし、型検査は `typecheck`（`tsc --noEmit`）へ分離する | `pnpm --filter @todo-ai-dlc/frontend build` が tsc の実出力を生成せず、`dist/` の内容が現行と機能的に同等。typecheck script が独立して動作し CI（RF-01）で実行される | CS-P2（CS-O3）／ v1 NFR-004 | 無駄な二重出力の除去。挙動変化なしの低リスク改善 |

### P2 — インフラ刷新・依存更新・開発基盤・文書

| ID | 要件 | 受入基準（pass/fail） | 出典 | 優先度根拠 |
|---|---|---|---|---|
| RF-14 | IAM 最小権限化（v1 設計ドリフト解消）: Lambda 実行ロールの DynamoDB 権限を `grantReadWriteData()` から v1 設計どおりの最小アクション集合（GetItem / PutItem / UpdateItem / DeleteItem / Scan）に限定する | synth したテンプレートの IAM ポリシーが上記 5 アクションのみを含む（infrastructure テストで assert）。全 API 操作（BT-1〜BT-7）が動作する | AR-O3（Q1=c）／ v1 infrastructure-design §6、NFR-003 | ドリフト解消（Q1）。認証なしデモのため即時脅威は限定的で P2（Q4 トレードオフで合意済み） |
| RF-15 | CloudWatch アラームの追加: Lambda Errors / Duration、API Gateway 5xx / Latency のアラームを CDK で定義し、NFR-001（500ms）を計測可能にする | synth したテンプレートに 4 種のアラームが存在する（infrastructure テストで assert）。Latency / Duration 系アラームの閾値が NFR-001 の 500ms と整合している（API GW Latency メトリクスはコールドスタートを含むため、統計方法（p95 等）と評価期間は NFR-001 の「コールドスタート除く」条件で誤報しないよう設計ステージで決定する） | AR-P6 / TS-P5（AR-O8, TS-O6）／ v1 NFR-001 | NFR-001 が初めて検証可能になる。コスト増は微小 |
| RF-16 | execute-api 直接アクセス対策（軽量実装）: CloudFront がオリジンへ付与するカスタムヘッダを API 側で検証し、CloudFront を経由しないリクエストを 403 で拒否する | CloudFront 経由の全 BT が不変で動作する。docker-compose / Vite proxy のローカル開発経路でも全 BT が動作し、E2E（RF-02）がパスする（CloudFront が存在しない経路での検証の無効化またはヘッダ注入の方式は設計ステージで決定）。カスタムヘッダなしの execute-api 直接リクエストが 403 を返す。ヘッダ値はコードにハードコードされない（Secret/パラメータ管理。保護目標はリポジトリへの平文コミット防止までとし、synth テンプレート・Lambda 環境変数上の可視性の扱いは設計ステージで定義する） | AR-P2(a)（AR-O2、Q3=c WAF 除外）／ v1 NFR-003 | 意図経路（CloudFront）の強制。WAF より低コストでデモ用途に見合う |
| RF-17 | CDK deprecated プロパティの移行: `pointInTimeRecovery` → `pointInTimeRecoverySpecification`、`logRetention` → 明示的 `logGroup` へ移行する | `cdk synth` が deprecation 警告なしで完了し、PITR 有効・ログ保持 90 日という構成値が不変。logRetention 用カスタムリソースがテンプレートから消える | AR-P5（AR-O7）／ v1 NFR-003（SECURITY-14） | RF-18（CDK 更新）と同時に実施するのが効率的 |
| RF-18 | 依存メジャー更新: aws-cdk-lib / aws-cdk を各々の現行版へ（CLI と lib はバージョン体系が分離済み — CLI は 2.1000 系）、Vitest 3 / Vite 7 / Biome 2 へ更新する（CDK は固定方針＝SECURITY-10 を維持したままバージョンのみ更新）。Vite 7 の Node エンジン要件上昇（^20.19 / >=22.12）に対する `node:20-slim` ベースイメージの適合確認を移行手順に含める。lockfile 内の react バージョン併存（TS-O5: 19.2.4/19.2.14）も dedupe で解消する。zod v4 は対象外（OOS-6） | 更新後に lint / typecheck / 全テスト / `cdk synth` / E2E がすべてパスする。CDK は引き続き完全固定で宣言される。lockfile に react の複数バージョンが併存しない | TS-P1（TS-O1, TS-O2, TS-O5, CS-O9）／ v1 NFR-004、SECURITY-10 | 教材の鮮度維持。P0 の検証ゲート確立後に安全に実施できる |
| RF-19 | 依存自動更新の継続化: Renovate（または Dependabot）を導入し、グループ化設定付きで依存更新 PR を自動生成する。CVE 監査は CI の `pnpm audit`（RF-01）と連動する | 自動更新設定ファイルがリポジトリに存在し、グループ化（例: minor/patch まとめ）が構成されている | DEP-P3（DEP-O5, TS-O2、Q3=c）／ v1 NFR-004 | 一括更新（RF-18）を一度きりにしないための継続プロセス |
| RF-20 | デプロイ手順のスクリプト化: `frontend build → cdk deploy` の暗黙のビルド順序をルート script として明示化し、README に記載する | ルート package.json に deploy script が存在し、クリーンな状態から 1 コマンドでデプロイ可能。手順が README に記載されている | DEP-P2（DEP-O2）／ v1 NFR-004 | 暗黙の手順は教材として致命的。数行で自己文書化できる |
| RF-21 | ローカル開発環境の堅牢化: Dockerfile.dev の `\|\| pnpm install` フォールバックを撤去して lockfile 固定を強制し、非 root ユーザーで実行する。`dev.ts` の port をハードコードから環境変数（`PORT` 既定 3001）に変更する | Dockerfile.dev にフォールバックが存在せず非 root で実行される。lockfile 不整合時にビルドが失敗する。`PORT` 未指定時は現行どおり 3001 で起動し、`docker compose up --build` で全 BT が動作する | CS-P5 / CS-P6（CS-O6, CS-O7）／ v1 NFR-004、SECURITY-10 | lockfile 迂回は SECURITY-10 の意図を弱める。開発基盤のため P2 |
| RF-22 | 仕様・設計記述の現状一致（ドキュメント更新）: ① v1 application-design の TodoForm 記述を現実装（作成専用 + TodoItem インライン編集）に更新（Q1 BO-O3 は実装が正）。② `PUT /api/todos/:id` が部分更新意味論であることを API 仕様として文書化。③ Lambda SDK 戦略（`externalModules` 維持＝ランタイム同梱版に依存）を明文化 | 3 点すべてが該当ドキュメントに反映され、RE の観測（BO-O3 / API-O1 / TS-O3）と記述が一致する | BO-P2（BO-O3、Q1=c）、API-P3 の文書化側（API-O1、Q2=b）、TS-P3（TS-O3）／ v1 application-design | コード変更を伴わず回帰リスクゼロ。ドリフトの「仕様更新」側の処置 |

## Non-Functional Requirements

### v1 継承（検証済み）

| ID | Requirement | Measure | 検証結果 |
|---|---|---|---|
| NFR-001 | API レスポンスタイム 500ms 以内（コールドスタート除く）、フロント初回ロード 3 秒以内 | CloudWatch の Lambda Duration / API GW Latency（RF-15 のアラーム閾値が 500ms と整合）。フロント初回ロード 3 秒は本 intent では計測対象外（RUM 等は OOS-9） | 未検証 → RF-15 で API 500ms 側のみ計測可能化（フロント 3 秒側は対象外） |
| NFR-002 | AWS マネージドサービスの SLA に準拠 | 全コンポーネントがマネージドサービス（Lambda / API GW / DynamoDB / S3 / CloudFront） | 充足 |
| NFR-003 | セキュリティ: 認証なし（デモ用途）を継続。CORS 適切設定。入力バリデーションを API レベルで実施 | zod による境界検証（充足）。CORS 一元化（RF-12）。IAM 最小権限（RF-14）。直接アクセス 403（RF-16）。エラー情報非開示（SECURITY-09）維持 | 部分充足 + ドリフト → RF-10/12/14/16 |
| NFR-004 | 開発体験: TypeScript strict / Biome / Vitest / pnpm monorepo | strict・Biome・Vitest・monorepo は充足。CI（RF-01）・E2E（RF-02）・コントラクト一元化（RF-03）で強化 | 部分充足 → RF-01/02/03/13 |

### 新規（Q3=c により追加）

| ID | Requirement | Measure |
|---|---|---|
| NFR-005 | 観測性: 主要なエラーとレイテンシ異常が、人手のログ確認なしに検知できる | 構造化（JSON）ログが出力される（RF-10/11）。Lambda Errors/Duration・API GW 5xx/Latency のアラームが存在する（RF-15） |
| NFR-006 | 継続的検証: main に入るすべての変更が自動検証ゲートを通過している | CI で lint / typecheck / test / `cdk synth` / E2E / `pnpm audit` が実行され（typecheck / test は shared を含む全 workspace パッケージが対象）、失敗時にマージ不可となる運用が文書化されている（RF-01/02） |
| NFR-007 | 依存健全性: 依存の陳腐化と既知脆弱性が継続的に検知される | Renovate 等の自動更新 PR が構成済み（RF-19）。CI の `pnpm audit` で CVE が検知される（RF-01） |

## Assumptions

- A-1: 本 API の既知クライアントは同梱 SPA のみであり、外部クライアントは存在しない（Q2=b「後方互換」の判断基準。補強根拠: AR-O10 — CSP `connect-src 'self'` が同一オリジン前提と整合。万一外部利用が判明した場合は RF-09/RF-12/RF-16 の影響を再評価する）
- A-2: 認証なし・単一共有リスト・デモ用途という v1 の性格は本 intent 後も継続する（BO-O1、v1 NFR-003）
- A-3: 既存 45 テストケースは現行振る舞いの「正」を表す。リファクタリングに伴いテストを更新する場合も、検証意図（何を保証するか）を保持する
- A-4: CI 基盤は GitHub Actions を想定する（リポジトリは GitHub ホスト。CS-O5 の `.aidlc-workflows/.github` は vendored であり流用しない）
- A-5: 単一環境（単一アカウント・単一ステージ）デプロイを継続する。`TodoTable` 固定名は許容し、複数環境対応（AR-P4）は行わない
- A-6: 本 intent でデータ移行は発生しない（テーブル名・キー設計・既存データは不変）
- A-7: E2E スモークは docker-compose のローカル環境で実行する（AWS 実環境への E2E は対象外）

## Out of Scope

- OOS-1: ユーザー認証・認可（v1 Out of Scope の継続。Q3 で再確認済み）
- OOS-2: WAF の導入（Q3=c で明示除外。デモ用途に対して月額コスト過剰。直接アクセス対策は RF-16 の軽量実装で代替）
- OOS-3: API 意味論の変更 — PUT → PATCH 化、空オブジェクト `{}` の拒否（現在は有効入力であり、拒否は後方互換違反。部分更新意味論は RF-22 で文書化対応）
- OOS-4: エンドポイントの削除・追加 — `GET /api/todos/:id` は維持（Q2=b）。詳細表示ユースケースの正式化（BO-P3 の正式化側）も新機能のため対象外
- OOS-5: ページネーション — limit/cursor パラメータの追加、`findAll` の LastEvaluatedKey ループ実装（API-O3。デモ規模で実害なし）
- OOS-6: zod v4 移行（TS-P2。エラーレスポンス形状＝API 契約への波及リスクがあり Q2=b の後方互換方針と衝突。将来 intent で API-P6 と同時設計）
- OOS-7: OpenAPI 定義の導入（API-P6。コントラクト単一ソース化は RF-03 で達成。依存・ビルド手順の増加に見合う必要が本 intent にはない）
- OOS-8: `TodoTable` 固定名の撤去・複数環境デプロイ対応（AR-P4。データ移行を伴い振る舞い保持方針に反する）
- OOS-9: X-Ray トレーシング・ダッシュボード・RUM 等の高度な観測性（アラームと構造化ログまでが本 intent の範囲）
- OOS-10: 新機能全般 — カテゴリ・タグ、優先度、期限、検索・フィルター、チーム共有、通知（v1 Out of Scope の継続）

## トレーサビリティ

### RF ↔ RE ↔ v1 対応表

| RF | 優先度 | RE 出典（Observation / Proposal） | v1 要件 ID |
|---|---|---|---|
| RF-01 | P0 | CS-O5, CS-O8, DEP-O5 / CS-P3, DEP-P3（audit） | NFR-004 |
| RF-02 | P0 | CS-O4 / CS-P4 | NFR-004 |
| RF-03 | P0 | CS-O1, CS-O2, BO-O6, DEP-O1 / CS-P1, DEP-P1, BO-P5 | NFR-004 |
| RF-04 | P1 | API-O8 / API-P4 | NFR-003 |
| RF-05 | P1 | API-O9 / API-P5 | FR-001, FR-003, FR-004 |
| RF-06 | P1 | BO-O5, API-O3 / BO-P4, API-P2（順序部分） | FR-002 |
| RF-07 | P1 | AR-O9, API-O2 / AR-P7, API-P1 | FR-003, FR-004 |
| RF-08 | P1 | BO-O2 / BO-P1（Q1=c 実装修正側） | FR-002 |
| RF-09 | P1 | BO-O4 / BO-P3（一部・Q2=b） | API Design（v1） |
| RF-10 | P1 | TS-O6, AR-O4 / TS-P4（Q1=c 実装修正側） | NFR-003（SECURITY-03） |
| RF-11 | P1 | AR-O5 / AR-P3 | NFR-003（SECURITY-09 両立） |
| RF-12 | P1 | AR-O1 / AR-P1 | NFR-003 |
| RF-13 | P1 | CS-O3 / CS-P2 | NFR-004 |
| RF-14 | P2 | AR-O3 / —（Q1=c 実装修正側） | NFR-003、infrastructure-design §6 |
| RF-15 | P2 | AR-O8, TS-O6 / AR-P6, TS-P5 | NFR-001 |
| RF-16 | P2 | AR-O2 / AR-P2(a)（Q3=c） | NFR-003 |
| RF-17 | P2 | AR-O7 / AR-P5 | NFR-003（SECURITY-14） |
| RF-18 | P2 | TS-O1, TS-O2, TS-O5, CS-O9 / TS-P1 | NFR-004（SECURITY-10 維持） |
| RF-19 | P2 | DEP-O5, TS-O2 / DEP-P3 | NFR-004 |
| RF-20 | P2 | DEP-O2 / DEP-P2 | NFR-004 |
| RF-21 | P2 | CS-O6, CS-O7 / CS-P5, CS-P6 | NFR-004（SECURITY-10） |
| RF-22 | P2 | BO-O3, API-O1, TS-O3 / BO-P2, API-P3（文書化側）, TS-P3 | application-design、API Design |

### 不採用とした RE Proposals（判断の記録）

| Proposal | 内容 | 判断 | 理由 |
|---|---|---|---|
| AR-P2(b) | WAF 追加 | 不採用 | Q3=c で明示除外。デモ用途に月額コスト過剰。RF-16（カスタムヘッダ検証）で代替 |
| AR-P2(c) | 直接アクセスの現状容認の明文化 | 不採用 | RF-16 採用により上位互換で解消 |
| AR-P4 | `TodoTable` 固定名の撤去 | 不採用 | データ移行を伴い振る舞い保持方針（BP-1）に反する。単一環境前提（A-5）で需要なし → OOS-8 |
| BO-P3（正式化側） | 詳細表示ユースケースの正式化 / エンドポイント削除 | 一部採用 | フロント `fetchTodo` 削除のみ採用（RF-09）。エンドポイントは後方互換のため維持、UI 正式化は新機能で範囲外 → OOS-4 |
| API-P2（ページネーション側） | LastEvaluatedKey ループ / limit・cursor パラメータ | 一部採用 | 順序保証のみ採用（RF-06）。パラメータ追加は API 意味論変更（Q2=c 側）でありデモ規模で実害なし → OOS-5 |
| API-P3（PATCH 側） | PATCH 化・空オブジェクト拒否 | 一部採用 | 文書化のみ採用（RF-22）。メソッド変更・`{}` 拒否は後方互換違反（Q2=b） → OOS-3 |
| API-P6 | OpenAPI 導入 | 不採用 | コントラクト単一ソース化は RF-03 で達成。依存・ビルド増に見合わない → OOS-7。将来 intent で zod v4（TS-P2）と同時設計が適切 |
| TS-P2 | zod v4 移行 | 不採用 | `flatten()` 廃止等が 400 レスポンス形状＝API 契約へ波及し Q2=b と衝突 → OOS-6 |
| TS-P3（バンドル同梱側） | SDK をバンドルに含めてバージョン固定 | 不採用 | コールドスタート優先で現状維持を選択。戦略の明文化のみ採用（RF-22 ③） |

## Refine 記録（contributor feedback への対処 — 2026-06-10）

> contributor: aidlc-systems-architect-agent（`aidlc-systems-architect-agent-contribution.md`）。指摘 12 件（高 H-1〜H-4 / 中 M-1〜M-4 / 低 L-1〜L-4）すべてを反映した。対処しなかった指摘はない。

### 反映内容

| 指摘 | 対処 |
|---|---|
| H-1 | RF-01 の「3 パッケージ」を「全 workspace パッケージ」へ変更し、受入基準に shared（RF-03）を含むことを明記。NFR-006 の Measure と Intent Summary の Scope にも 4 パッケージ化を反映（注: NFR-006 の Measure に「3 パッケージ」の字句は元々なかったが、対象範囲を明示して曖昧さを除去した） |
| H-2 | 推奨どおり RF-02 の範囲を拡張する側を採用。E2E に BT-7（`GET /api/health` 200）の 1 アサーションを追加し、BP-1 受入基準 2 も更新。BT 表の BT-7 行「backend unit + E2E」に要件の裏付けができた |
| H-3 | BP-1 の許容変更リストに「RF-07 に伴う 400/404 優先順位の変更（不正ボディ かつ 不存在 id の複合ケース限定）」を追加（許容変更 4）し、RF-07 で複合ケースは 400 を正と確定、受入基準に当該テストを追加。判断理由: 400/404 とも既存コントラクトに定義済みのステータスで、複合ケースの優先順位はコントラクト未規定 → Q2=b（コントラクト後方互換の範囲）の趣旨に収まる。設計ステージへ先送りせず要件で確定したのは、未決定のままでは BP-1 の回帰判定（pass/fail）が曖昧になるため |
| H-4 | RF-16 受入基準に「docker-compose / Vite proxy のローカル経路で全 BT が動作し E2E（RF-02）がパスする」を追加。あわせて Secret/パラメータ管理の保護目標（リポジトリへの平文コミット防止まで）と synth テンプレート・環境変数上の可視性の扱いを設計ステージで定義する旨を追記 |
| M-1 | RF-12 受入基準を「高々 1 箇所（0 箇所＝両方撤去も可）」へ修正。CORS ヘッダの変更・消失を BP-1 許容変更 5 として A-1 を根拠に明記 |
| M-2 | NFR-001 の Measure と検証結果 2 表に「フロント初回ロード 3 秒は本 intent では計測対象外（OOS-9 と整合）」を明記し、RF-15 の達成範囲を API 500ms 側に限定して表現 |
| M-3 | RF-15 受入基準に「API GW Latency はコールドスタートを含むため、統計方法（p95 等）と評価期間は NFR-001 の『コールドスタート除く』条件で誤報しないよう設計ステージで決定する」を追記 |
| M-4 | RF-06 に同一 createdAt（ミリ秒一致）の tie を第 2 ソートキーで決定的に並べる要件を追加（候補: id 降順＝ULID 辞書順。最終決定は設計ステージ）。受入基準に決定性の検証を追加 |
| L-1 | RF-03 受入基準のリテラル制約を「プロダクションコード内」にスコープ限定（テストコードの扱いは設計ステージで決定） |
| L-2 | RF-01 要件に `pnpm audit` の severity 閾値（例: `--audit-level=high`）を設計ステージで決定する旨を追記 |
| L-3 | RF-18 に①CLI/lib のバージョン体系分離（CLI は 2.1000 系）②Vite 7 の Node エンジン要件上昇に対する `node:20-slim` 適合確認③lockfile の react 併存（TS-O5）の dedupe を追記し、受入基準に「react の複数バージョンが併存しない」を追加。出典に TS-O5, CS-O9 を併記 |
| L-4 | トレーサビリティ補強: RF-10 出典に TS-O6 を併記（TS-P4 の原典対応どおり）。A-1 に AR-O10（CSP `connect-src 'self'`）を補強根拠として追記し、再評価対象に RF-12 を追加 |

### 対処しなかった指摘

なし。

### 変更サマリー

- RF の増減: なし（RF-01〜22 / 22 件のまま）。NFR・FR・OOS の増減もなし
- BP-1: 許容変更を箇条書き化し 2 件追加（RF-07 複合ケースの 400 化 / RF-12 CORS ヘッダ変更）。受入基準 2 に BT-7 を追加
- 受入基準の変更: RF-01（全 workspace 対象 + audit 閾値）/ RF-02（BT-7 追加）/ RF-03（プロダクションコード限定）/ RF-06（tie 決定性）/ RF-07（複合ケース 400 テスト）/ RF-12（高々 1 箇所）/ RF-15（統計・評価期間の設計委任）/ RF-16（ローカル経路保証 + Secret 保護目標）/ RF-18（react dedupe）
- questions.md / plan.md / contribution ファイルは変更していない
