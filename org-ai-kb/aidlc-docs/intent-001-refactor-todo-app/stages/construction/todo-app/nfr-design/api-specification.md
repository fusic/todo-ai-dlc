# API Specification — nfr-design / unit: todo-app (UNIT-001)

> Stage: nfr-design / Owner: aidlc-systems-architect-agent / 2026-06-10
> copy-forward: functional-design 版 `api-specification.md` を全節不変のままコピーし、末尾に
> 「NFR Annotations」節と「OQ-1〜OQ-3 の解決状況」節のみを追記した（blueprint identity 維持 —
> API ID・操作仕様・Payload・Versioning・Open Questions 原本は不変）。
> 原本: `stages/construction/todo-app/functional-design/api-specification.md`。
>
> ＜functional-design 時点のヘッダ（保存）＞
> Stage: functional-design / Owner: aidlc-systems-architect-agent / 2026-06-10
> 役割: CMP-002（Todo Backend API）の provider 側インターフェース仕様。contract-design は本 workflow に不在（単一 unit）のため、
> RE `api-documentation.md` の System Contracts 表（6 エンドポイント + 共通エラー応答）を boundary 事実として継承し、
> 本 intent の承認済み変更（BP-1 許容変更 5 件）を反映した「あるべきコントラクト」を定義する。
> RF-22②（PUT の部分更新意味論の API 仕様化）は API-004 の節が v2 側の正式文書である。
> 規律: technology-agnostic（REST/JSON はインターフェース形式、ULID / ISO 8601 は形式仕様として記載）。
> （nfr-design 追記節のみ例外的に技術固有名を含む — 本ステージの管轄が技術選定のため。正は nfr-specification.md）

## 通信前提（コントラクトの前提条件）

| 前提 | 内容 | 根拠 |
|---|---|---|
| 同一オリジン | 既知クライアントは同梱 SPA（CMP-001）のみ。本番 = CDN 経由の同一オリジン `/api`、ローカル = 開発プロキシ経由 `/api`。クロスオリジン応答ヘッダ（CORS）は**定義しない（0 箇所）** | Q2=a（本ステージ決定）/ RF-12 / A-1 / BP-1 許容変更 5 |
| 意図経路の強制 | 意図経路（CDN 経由）の証明を持たないバックエンド直接アクセスは全操作で 403（BR-013）。ローカル開発経路では全 BT が不変で動作する | RF-16 / BP-1 許容変更 3 |
| 認証 | なし（デモ用途の継続 — A-2 / OOS-1）。全操作共通 | NFR-003 |
| 形式 | リクエスト・レスポンスとも JSON（API-005 の 204 と API-006 を除きボディあり） | 現状コントラクト維持 |

## Interface Summary

| ID | Type | Name | Component | Consumer(s) | Contract |
|---|---|---|---|---|---|
| API-001 | REST | TODO 作成 — `POST /api/todos` | CMP-002 | CMP-001（エンドユーザー） | RE api-documentation.md System Contracts（本書が v2 正） |
| API-002 | REST | TODO 一覧取得 — `GET /api/todos` | CMP-002 | CMP-001（エンドユーザー） | 同上 + 順序保証を追加（BR-010） |
| API-003 | REST | TODO 個別取得 — `GET /api/todos/:id` | CMP-002 | （外部 API 利用者のみ — UI 未使用、RF-09 後も維持） | 同上 |
| API-004 | REST | TODO 更新 — `PUT /api/todos/:id` | CMP-002 | CMP-001（エンドユーザー） | 同上 + 部分更新意味論を明文化（RF-22②） |
| API-005 | REST | TODO 削除 — `DELETE /api/todos/:id` | CMP-002 | CMP-001（エンドユーザー） | 同上 |
| API-006 | REST | ヘルスチェック — `GET /api/health` | CMP-002 | 運用者・監視・E2E（RF-02 BT-7 アサーション） | 同上 |

## Operations

### API-001: TODO 作成（POST /api/todos）

| Field | Value |
|---|---|
| Purpose | TODO を 1 件登録する（BT-1） |
| Trigger | request（CMP-001 の作成フォーム送信） |
| Auth / Permission | なし。意図経路の証明のみ（BR-013） |
| Input | CreateTodoInput（後述） |
| Output | `201` — 作成された Todo（id / completed / createdAt / updatedAt はサーバー付与） |
| Business rules | BR-001, BR-002, BR-003, BR-004, BR-005, BR-008, BR-012, BR-013 |
| Entities | ENT-001 |
| Errors | `400` 検証失敗（BR-001/002）・不正 JSON（BR-008） / `403` 意図経路外（BR-013） / `500` 内部エラー（BR-012） |
| Versioning | 後方互換維持（requirements Q2=b）。入出力形状・ステータスは現行コントラクト不変 |

### API-002: TODO 一覧取得（GET /api/todos）

| Field | Value |
|---|---|
| Purpose | 全 TODO をソート済みで取得する（BT-2） |
| Trigger | request（CMP-001 の初期ロード・再取得） |
| Auth / Permission | なし。意図経路の証明のみ（BR-013） |
| Input | なし（ページネーションパラメータなし — OOS-5） |
| Output | `200` — `Todo[]`。**createdAt 降順・tie は id 降順でソート済み**（BR-010 — 順序保証はコントラクトの一部）。0 件時は `[]` |
| Business rules | BR-010, BR-012, BR-013 |
| Entities | ENT-001 |
| Errors | `403` 意図経路外（BR-013） / `500` 内部エラー（BR-012） |
| Versioning | 順序保証の追加は後方互換の強化（形状・ステータス不変 — BP-1 許容変更 1 内）。CMP-001 は防衛的ソートを行わない（Q1=a） |

### API-003: TODO 個別取得（GET /api/todos/:id）

| Field | Value |
|---|---|
| Purpose | id 指定で 1 件取得する（BT-6）。UI 未使用だが公開コントラクトとして維持（Q2=b / OOS-4。CMP-001 の未使用クライアントのみ削除 — RF-09） |
| Trigger | request（外部 API 利用者） |
| Auth / Permission | なし。意図経路の証明のみ（BR-013） |
| Input | パスパラメータ `id`（形式検証なし — 現状コントラクト維持、BR-007） |
| Output | `200` — Todo |
| Business rules | BR-007, BR-012, BR-013 |
| Entities | ENT-001 |
| Errors | `404` 存在しない id（BR-007） / `403` 意図経路外（BR-013） / `500` 内部エラー（BR-012） |
| Versioning | 完全不変（エンドポイント削除は OOS-4） |

### API-004: TODO 更新（PUT /api/todos/:id）— 部分更新意味論（RF-22② 正式文書）

| Field | Value |
|---|---|
| Purpose | title / description / completed を**部分更新**する（BT-3 編集 / BT-4 完了切替 — API 上は同一操作） |
| Trigger | request（CMP-001 のインライン編集保存・完了トグル） |
| Auth / Permission | なし。意図経路の証明のみ（BR-013) |
| Input | UpdateTodoInput（後述）— **全フィールド任意。空オブジェクト `{}` も有効入力**（BR-006。その場合 updatedAt のみ更新。空オブジェクト拒否・PATCH 化は後方互換違反のため行わない — OOS-3） |
| Output | `200` — 更新後の Todo 全体（updatedAt 更新済み — BR-005） |
| Business rules | BR-001, BR-002, BR-005, BR-006, BR-007, BR-008, BR-009, BR-012, BR-013 |
| Entities | ENT-001 |
| Errors | `400` 検証失敗・不正 JSON（BR-001/002/008） / `404` 存在しない id（BR-007） / **複合ケース（不正ボディ × 存在しない id）は 400 優先（BR-009 — BP-1 許容変更 4）** / `403` 意図経路外（BR-013） / `500` 内部エラー（BR-012） |
| Versioning | 後方互換維持。存在判定のアトミック化（BR-007 — RF-07）で upsert 経路を排除するが外部観測可能な応答は複合ケースを除き不変 |

### API-005: TODO 削除（DELETE /api/todos/:id）

| Field | Value |
|---|---|
| Purpose | TODO を物理削除する（BT-5） |
| Trigger | request（CMP-001 の削除操作） |
| Auth / Permission | なし。意図経路の証明のみ（BR-013） |
| Input | パスパラメータ `id` |
| Output | `204` — ボディなし |
| Business rules | BR-007, BR-012, BR-013 |
| Entities | ENT-001 |
| Errors | `404` 存在しない id（BR-007 — 存在判定と削除はアトミック） / `403` 意図経路外（BR-013） / `500` 内部エラー（BR-012） |
| Versioning | 完全不変 |

### API-006: ヘルスチェック（GET /api/health）

| Field | Value |
|---|---|
| Purpose | 稼働確認（BT-7 — 運用トランザクション）。RF-16 等のミドルウェア変更による意図しない 403 化の回帰検知点（E2E に 200 アサーション — RF-02） |
| Trigger | request（運用者・監視・E2E） |
| Auth / Permission | なし。意図経路の証明のみ（BR-013 — 意図経路・ローカル経路では常に到達可能でなければならない） |
| Input | なし |
| Output | `200` — `{"status": "ok"}` |
| Business rules | BR-012, BR-013 |
| Entities | なし（エンティティに触れない） |
| Errors | `403` 意図経路外（BR-013） / `500` 内部エラー（BR-012） |
| Versioning | 完全不変 |

## Payload Schemas

> 形状・制約値の定義の単一ソースは CMP-003（RF-03 / BR-014）。本表はその論理仕様。

### Todo（応答 — API-001/002/003/004）

| Field | Type | Required | Constraints | Source |
|---|---|---|---|---|
| id | string | yes | ULID 形式 26 文字。サーバー生成・不変 | ENT-001.id / BR-003 |
| title | string | yes | 1〜200 文字 | ENT-001.title / BR-001 |
| description | string | no | 0〜1000 文字 | ENT-001.description / BR-002 |
| completed | boolean | yes | 作成時 false | ENT-001.completed / BR-004 |
| createdAt | string | yes | ISO 8601。サーバー付与・不変 | ENT-001.createdAt / BR-005 |
| updatedAt | string | yes | ISO 8601。更新成功のたびにサーバー更新 | ENT-001.updatedAt / BR-005 |

### CreateTodoInput（API-001 入力）

| Field | Type | Required | Constraints | Source |
|---|---|---|---|---|
| title | string | yes | 1〜200 文字（上限は CMP-003 共有定数） | BR-001 / FR-001 |
| description | string | no | ≤1000 文字（上限は CMP-003 共有定数） | BR-002 / FR-001 |

（id / completed / createdAt / updatedAt は入力に存在しない — BR-003/004/005）

### UpdateTodoInput（API-004 入力 — 全フィールド任意）

| Field | Type | Required | Constraints | Source |
|---|---|---|---|---|
| title | string | no | 存在する場合 1〜200 文字 | BR-001 / FR-003 |
| description | string | no | 存在する場合 ≤1000 文字 | BR-002 / FR-003 |
| completed | boolean | no | — | BR-004 / FR-003 |

（空オブジェクト `{}` は有効入力 — BR-006。未知フィールドは無視）

### 共通エラー応答（現行コントラクト維持）

| 状況 | Status | Body（論理形状） | Rule |
|---|---|---|---|
| 入力検証失敗 | 400 | `{"error": "Validation failed", "details": {field: [messages]}}` | BR-001, BR-002 |
| 不正 JSON ボディ | 400 | エラー JSON（`error` キーを含む） | BR-008 |
| 対象なし | 404 | `{"error": "Todo not found"}` | BR-007 |
| 複合（不正ボディ × 不存在 id） | 400 | 検証失敗と同形 | BR-009 |
| 意図経路外アクセス | 403 | エラー JSON（`error` キーを含む。内部情報なし） | BR-013 |
| 未処理例外 | 500 | `{"error": "Internal server error"}`（内部情報非開示） | BR-012 |

## Versioning（互換性方針）

- 方針: **後方互換維持**（requirements Q2=b）。メソッド / パス / ステータスコード / レスポンス形状は、BP-1 許容変更 5 件を除き不変（BP-1 受入基準 3）。
- 本仕様で現行コントラクトから変わる点（すべて承認済み）:
  1. 不正 JSON ボディ 500 → 400（BR-008 — 許容変更 1）
  2. 一覧の順序保証の追加（BR-010 — 許容変更 1。形状不変の強化）
  3. 直接アクセスの 403 化（BR-013 — 許容変更 3）
  4. 複合ケースの 404 → 400（BR-009 — 許容変更 4）
  5. CORS 応答ヘッダの消失（通信前提 Q2=a — 許容変更 5）
- 破壊的変更（PATCH 化・空オブジェクト拒否・エンドポイント削除・ページネーション・エラー形状変更）は本 intent では行わない（OOS-3/4/5/6）。

## Open Questions（後続ステージへの委譲 — units.md 申し送りの継承）

| # | Question | Blocks | 委譲先 |
|---|---|---|---|
| OQ-1 | BR-013 のローカル経路方式（検証の無効化かヘッダ注入か）と Secret 可視性（synth テンプレート・環境変数上の扱い） | API 全操作のローカル開発・E2E 実行（RF-02/16） | nfr-design / infrastructure-design（申し送り #3） |
| OQ-2 | CI の依存監査 severity 閾値 | なし（API 仕様には影響しない。CI ゲート設計のみ） | nfr-design（申し送り #4） |
| OQ-3 | レイテンシアラームの統計方法（p95 等）と評価期間（NFR-001「コールドスタート除く 500ms」で誤報しない設計） | なし（API 仕様には影響しない。観測設計のみ） | nfr-design / infrastructure-design（申し送り #6） |

## NFR Annotations（nfr-design で追記 — 2026-06-10。正は nfr-specification.md）

### 共通（全 API — 単一実行基盤のため共通規定）

| 項目 | 規定 | 根拠 |
|---|---|---|
| レイテンシ目標 | unit 共通で **QT-1: Lambda Duration p95 ≤ 500ms**（NFR-001 の正式計測点 — コールドスタートはメトリクス定義で除外）。経路全体は QT-2: API GW Latency p99 ≤ 1500ms（補助検知） | D-4 / RF-15 |
| タイムアウト | Lambda 30s / API GW 統合 30s（既存実行基盤の所与 — 変更なし）。クライアント側タイムアウトは未設定（現状維持 — ブラウザ既定） | C-1（BP-1） |
| レート制限 | API GW アカウント既定スロットリングのみ（個別設定なし。WAF は OOS-2） | C-8 |
| 経路保護 | 全 API の前段に意図経路検証（BR-013）。本番 = CDN 付与ヘッダを Secrets Manager 由来の値で検証、ローカル = dev 専用値の注入で同一コードパス（検証ミドルウェア常時有効 — フェイルオープン経路なし） | QT-4（D-1 / D-2） |
| observability | 構造化ログ（JSON）必須フィールド: **method / path / status / requestId、エラー時 stack**（実装 = Powertools Logger、接続は code-generation）。400/403 はクライアント起因としてエラーアラーム対象外（RF-04 による 500→400 再分類が前提）。5xx・Duration はアラーム対象（4 種 + SNS — リソース定義は infrastructure-design） | QT-6（D-4 / D-5 / D-6） |

### API 別（リトライ / 冪等性 — 上の共通規定との差分のみ）

| API ID | Retry / Idempotency | 備考 |
|---|---|---|
| API-001（POST） | **非冪等**（呼ぶたび新規 ULID — BR-003）。自動リトライしない。失敗は BR-011 でユーザー可視化し人間が再操作 | ペイロード上限は BR-001/002 で実質制約 |
| API-002（GET 一覧） | **安全・冪等** — リトライ可（クライアント自動リトライは未実装・現状維持） | 全件応答（OOS-5 — デモ規模で許容） |
| API-003（GET :id） | **安全・冪等** | — |
| API-004（PUT） | **冪等** — 同一入力の再送はリソース状態を変えない（updatedAt のみ再更新 — BR-005/006）。自動リトライしない。失敗は BR-011 | — |
| API-005（DELETE） | **効果として冪等** — 2 回目は 404（BR-007）、副作用は再発しない。自動リトライしない。失敗は BR-011 | — |
| API-006（health） | **安全・冪等** — 監視・E2E が任意頻度で呼出可（エンティティに触れない） | 誤 403 化の回帰は E2E BT-7 で検知（BR-013 violation 欄） |

## OQ-1〜OQ-3 の解決状況（nfr-design で追記 — 2026-06-10。原本の Open Questions 表は不変のまま保存）

| # | 決定（questions.md 本ステージ Q1〜Q5） | 残余の委譲 |
|---|---|---|
| OQ-1 | **解決**（Q1=a / Q2=a — D-1 / D-2）: ローカル経路 = dev 専用値のヘッダ注入（検証ミドルウェア常時有効・本番と同一コードパス。dev 値はリポジトリにコミット — 解釈は nfr-specification.md C-5）。本番値 = Secrets Manager 自動生成 + CloudFormation 動的参照（リポジトリ・synth テンプレートとも平文 0 件 — BR-013 の字句を充足、F-3 解消） | CloudFront ヘッダ付与・Secret 注入の construct 構成 = infrastructure-design / 検証ミドルウェア実装 = code-generation |
| OQ-2 | **解決**（Q3=a — D-3）: `pnpm audit --audit-level=high`。修正不能 advisory は `auditConfig.ignoreCves`（理由コメント付き）で個別 ignore、Renovate 解消時に削除（nfr-specification.md C-6） | CI workflow 実装 = code-generation |
| OQ-3 | **解決**（Q4=a / Q5=a — D-4 / D-5）: NFR-001 の正式計測点 = Lambda Duration p95。主アラーム = Duration p95 > 500ms（period 5 分・3/3 datapoints・missing=notBreaching）、補助 = API GW Latency p99 > 1500ms。通知 = SNS トピック（CDK 作成・購読手動） | アラーム・SNS リソース定義 = infrastructure-design |
