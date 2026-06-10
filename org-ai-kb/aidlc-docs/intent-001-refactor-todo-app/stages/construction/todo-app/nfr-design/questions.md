# Questions — nfr-design / unit: todo-app (UNIT-001)

> Stage: nfr-design / Owner: aidlc-systems-architect-agent / 2026-06-10
> 質問番号は本ステージローカルの系列（requirements の Q1〜Q4、functional-design の Q1〜Q5 とは別物 — 誤読注意）。
> 出典: Q1〜Q2 = api-specification.md OQ-1（units.md 申し送り #3）/ Q3 = OQ-2（#4）/ Q4 = OQ-3（#6）。
> Q5〜Q7 は stage definition が本ステージの管轄とする tech stack 選定（通知設計・構造化ログ・E2E フレームワーク）。
> 前提として確定済みのため質問しない事項: CI 基盤 = GitHub Actions（A-4）、E2E は docker-compose ローカル実行（A-7）、
> 依存バージョン到達点 = Vitest 3 / Vite 7 / Biome 2 / CDK 現行版・完全固定（RF-18）、zod v4 非移行（OOS-6）、
> Lambda 256MB / 30s・DynamoDB オンデマンド・PITR 等の既存実行基盤構成（BP-1 — 変更要件なし）。

---

### Q1: RF-16（BR-013 意図経路の強制）のローカル開発・E2E 経路の方式はどうするか？（OQ-1 前半）

a) **ヘッダ注入方式** — ローカル（docker-compose / Vite proxy / E2E）でもリポジトリにコミットする dev 専用値（例: `local-dev-only` と明示した値）を注入し、検証ミドルウェアを常時有効のまま本番と同一コードパスを通す
b) **環境フラグ無効化方式** — Secret 未設定（またはフラグ off）のときは検証ミドルウェアをスキップし、ローカルでは検証なしで動作させる
c) **ハイブリッド** — 実装は b と同じフェイルオープン（Secret 未設定ならスキップ）だが、IaC が本番には必ず Secret を設定することをインフラテストで assert して片肺を塞ぐ
d) Other

**Trade Offs:**
- a: E2E（RF-02）が BR-013 の検証ロジック込みで全 BT + BT-7 を回すため、「ミドルウェア変更による意図しない 403 化」（BR-013 violation 欄が名指しする回帰）をローカルで検知できる。フェイルオープン経路が存在しない。代わりに docker-compose / Vite proxy / Playwright 設定に注入設定が増え、dev 専用値がリポジトリに載る（本番値とは独立した値であり「本番 Secret の平文コミット防止」という確定済み保護目標には抵触しないが、RF-16 受入基準の「ヘッダ値はハードコードされない」を「**本番**ヘッダ値は」と読むことを nfr-specification.md に明記する必要がある）
- b: ローカル構成が最少。ただし検証パスの動作確認が unit テストだけになり、E2E の BT-7 アサーションが検証ミドルウェアを通らない（RF-02 が BR-013 回帰検知器として機能しない）。さらに「本番で Secret 設定漏れ → 検証が無言で無効」というフェイルオープンの危険が残る
- c: b のローカル単純さを保ちつつ設定漏れはテストで塞げるが、E2E が検証パスを通らない点は b と同じ

**Recommendation:** **a（ヘッダ注入方式）**。RF-16 の受入基準は「ローカル経路でも全 BT が動作し E2E がパスする」ことを要求しており、検証ロジックを通した上でそれを満たすのが最も強い保証になる。BR-013 の violation 欄（誤拒否は E2E BT-7 で検知）とも整合する。dev 値の扱い（保護目標との関係）は nfr-specification.md の Constraints に明文化する。

[Answer]: a — ヘッダ注入方式。dev 専用値を注入し検証ミドルウェア常時有効、本番と同一コードパス。dev 値の扱いは nfr-specification.md の Constraints に明文化する。

---

### Q2: RF-16 の本番ヘッダ値の管理と可視性はどうするか？（OQ-1 後半 — 確定済み保護目標は「リポジトリへの平文コミット防止まで」）

a) **Secrets Manager 自動生成** — IaC が Secret を自動生成し、CloudFront のオリジンカスタムヘッダと API 側検証の両方へ CloudFormation 動的参照で注入する。リポジトリ・synth テンプレートとも平文なし。コスト約 +$0.40/月
b) **SSM Parameter Store（無料）** — パラメータを手動投入し、デプロイ時に解決する。コストゼロだが「手動投入」という運用ステップが増え、初回デプロイが 1 コマンドで完結しなくなる（RF-20 と緊張）
c) **デプロイ時パラメータ渡し（CDK context / 環境変数）** — リポジトリには載らないが synth テンプレート（cdk.out）と Lambda 環境変数に平文が載る。確定済み保護目標の範囲内ではある
d) Other

**Trade Offs:**
- a: 自動生成のため手動ステップゼロで RF-20（1 コマンドデプロイ）と整合。テンプレート上も参照文字列のみで、F-3（BR-013 の「構成物に平文で保持しない」という字句）と最も整合する。微小な月額コストと、ローテーション時に CloudFront / Lambda 両方への再配布が必要という運用特性（デモではローテーション不要なので実害なし）
- b: コストゼロだが手動投入が必要。CDK は SecureString の作成に対応しないため自動化しにくい
- c: 最も単純・無料だが、Lambda 環境変数・テンプレート上の平文可視性という OQ-1 の論点が「可視のまま許容」という決定になる。cdk.out の gitignore 確認が追加で必要

**Recommendation:** **a（Secrets Manager 自動生成）**。WAF（月額 $5〜）を除外した判断（OOS-2）とはコスト桁が違い（$0.40/月）、教材として「オリジン検証ヘッダの正しい管理」を示す価値が上回る。BR-013 の字句（構成物に平文で保持しない）をそのまま満たせる唯一の選択肢。具体の construct 設計は infrastructure-design に委譲し、本ステージは方針（posture）として確定する。

[Answer]: a — Secrets Manager 自動生成。CloudFront と API 検証へ動的参照注入、手動ステップゼロで RF-20 と整合。BR-013 字句をそのまま満たす。

---

### Q3: RF-01 CI の `pnpm audit` severity 閾値はどうするか？（OQ-2）

a) `--audit-level=high` — high / critical で fail（requirements の例示と同じ）
b) `--audit-level=critical` — critical のみで fail
c) `--audit-level=moderate` — moderate 以上で fail

**Trade Offs:**
- a: 実害可能性の高い脆弱性を確実に止めつつ、moderate 起因の恒常 fail（修正不能な上流 advisory で CI が常時赤になる事態）をある程度回避できるバランス点
- b: ノイズ最少だが high を素通しするのは「継続的検証」（NFR-006）の趣旨に対して緩すぎる
- c: 最も厳格だが、デモ規模のリポジトリでも moderate advisory は頻出し、恒常 fail → CI 無視の習慣化という最悪の結果を招きやすい

**Recommendation:** **a（high）**。あわせて、修正不能 advisory への恒常 fail 対策として pnpm の `auditConfig.ignoreCves`（package.json）で理由コメント付き個別 ignore を許可し、ignore エントリは Renovate（RF-19）の更新で解消され次第削除する運用を nfr-specification.md に記録する。

[Answer]: a — high。ignoreCves（理由コメント付き）+ Renovate 解消時削除の運用を併記する。

---

### Q4: RF-15 レイテンシ系アラームの統計方法・評価期間はどうするか？（OQ-3 — NFR-001「コールドスタート除く 500ms」で誤報しない設計）

a) **主アラーム = Lambda Duration p95 > 500ms**（period 5 分、3/3 datapoints、missing data = notBreaching）+ **API GW Latency p99 > 1500ms** を補助アラームとして閾値を緩めて設定
b) Lambda Duration / API GW Latency とも p95・500ms で統一（period 5 分、3/3 datapoints）
c) 平均（Average）ベースで 500ms

**Trade Offs:**
- a: CloudWatch の Lambda `Duration` メトリクスは Init フェーズ（コールドスタート初期化）を含まないため、「コールドスタート除く 500ms」という NFR-001 の条件を**メトリクスの定義そのもの**で満たせる。API GW Latency は Init 込みの経路全体値なので、500ms に張ると低トラフィック（デモ）ではコールドスタート踏襲リクエストだけで誤報する — 閾値を緩めて「経路全体の異常検知」と役割分担する。p95 は低トラフィックでは統計が荒れるが、5 分 × 3 連続 + missing=notBreaching で平滑化する
- b: 閾値の見かけは NFR-001 と一致するが、API GW 側がコールドスタートで構造的に誤報する（RF-15 受入基準が명시的に回避を要求している事態）
- c: 平均は外れ値を均してしまい、テールレイテンシ劣化（ユーザー体感の劣化）を検知できない

**Recommendation:** **a**。NFR-001 の正式な計測点を Lambda Duration p95 と定義し（nfr-specification.md の Quality Targets に明記）、API GW Latency / 5xx / Lambda Errors は異常検知の補助とする。RF-15 受入基準の「Latency / Duration 系アラームの閾値が 500ms と整合」は「主アラーム（Lambda Duration）= 500ms、補助（API GW Latency）= 500ms との整合根拠を文書化した緩和値」という形で満たす。

[Answer]: a — 主アラーム = Lambda Duration p95 > 500ms（5 分×3、missing=notBreaching）+ API GW Latency p99 > 1500ms 補助。NFR-001 の計測点を Lambda Duration p95 と定義する。

---

### Q5: RF-15 アラームの通知先（アラームアクション）はどうするか？

a) **SNS トピックのみ CDK で作成しアクション接続**（購読＝メール等は手動。リポジトリに個人情報を載せない）
b) アクションなし（アラーム状態の遷移のみ。RF-15 受入基準の最小充足）
c) SNS + 購読先メールを CDK パラメータ化

**Trade Offs:**
- a: 「鳴っても誰にも届かない」状態を構造的に避けつつ、個人メールアドレスのコミットを避けられる。購読 1 ステップだけ手動が残る
- b: 構成最少だが NFR-005「人手のログ確認なしに検知」の到達点としては弱い（CloudWatch コンソールを見に行く必要がある）
- c: 購読まで自動化できるがメールアドレスがパラメータとして構成に載り、教材リポジトリの性格と相性が悪い

**Recommendation:** **a**。SNS は無料枠内でコスト影響なし。購読手順は README（RF-20 のデプロイ手順）に 1 行追記する。

[Answer]: a — SNS トピックのみ CDK 作成しアクション接続。購読は手動、手順を README に 1 行追記。

---

### Q6: RF-10/RF-11 構造化ログの実装方式はどうするか？

a) **AWS Lambda Powertools for TypeScript（Logger）** — Lambda コンテキスト自動付与・ログレベル・child logger を標準装備。将来 Metrics / Tracer への拡張路線（OOS-9 の将来 intent）が同一ライブラリで得られる。依存 1 系統追加（Renovate RF-19 の管理下に入る）
b) **軽量自前 JSON ロガー** — hono/logger を数十行の JSON 出力ミドルウェアに置換。依存ゼロ・バンドル最小
c) **pino** — 高速・汎用だが Lambda 向けのコンテキスト付与は自前実装になり、a と b の中間の手間で a の標準性がない

**Trade Offs:**
- a: AWS 公式のベストプラクティスを教材として示せる。RF-10（method/path/status を含む JSON）と RF-11（err.stack のサーバー側出力）を同一 API で実装でき、SECURITY-03 コメントとの一致（ドリフト解消）が明快。esbuild バンドルで実質サイズ増は小
- b: 依存を増やさない最小主義。ただし「自前ロガーの保守」という新しい保守対象が生まれ、教材としては車輪の再発明を示すことになる
- c: 選ぶ積極的理由がこのワークロードにはない

**Recommendation:** **a（Powertools Logger）**。本リポジトリは教材であり（intent / Change rate 参照）、「AWS 標準の観測性実装例」を示すこと自体に価値がある（AR-P6 の趣旨とも一致）。Hono ミドルウェアとの接続（リクエストログ出力点）は code-generation の管轄とし、本ステージはライブラリ選定と出力必須フィールド（method / path / status / requestId / エラー時 stack）の規定まで行う。

[Answer]: a — AWS Lambda Powertools for TypeScript（Logger）。出力必須フィールドは method / path / status / requestId / エラー時 stack。

---

### Q7: RF-02 E2E スモークテストのフレームワークはどうするか？

a) **Playwright（@playwright/test）** — requirements の例示どおり。GitHub Actions（A-4）公式サポート・自動待機・トレース取得が標準。テストランナーは Vitest と分離（責務が違うため衝突しない）
b) **Cypress** — 実績はあるが実行が遅く、CI コンテナでの安定運用に追加設定が多い
c) Other

**Trade Offs:**
- a: docker-compose 起動（A-7）との組合せが素直で、既存 data-testid（RF-02 受入基準が活用を要求）をそのまま locator に使える。依存は devDependencies に閉じる
- b: a に対する優位点がこの規模では特にない

**Recommendation:** **a（Playwright）**。BT-1〜BT-5 の 1 周 + BT-7（health 200）という小さいスイートであり、最も標準的で CI 安定性の高い選択を採る。

[Answer]: a — Playwright（@playwright/test）。BT-1〜5 の 1 周 + BT-7（health）の小スイート。

---

> 2026-06-10: 人間レビュー完了。Q1〜Q7 すべて回答済み（全問 a を採択）。plan.md は提示のとおり承認され、成果物生成（Step 2〜7）への着手が許可された。
