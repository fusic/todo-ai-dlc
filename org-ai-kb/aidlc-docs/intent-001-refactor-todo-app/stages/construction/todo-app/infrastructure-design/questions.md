# Questions — infrastructure-design / unit: todo-app

> Stage: infrastructure-design / Owner: aidlc-systems-architect-agent / 2026-06-10
> 前提: 本ステージの主要な決定は上流（nfr-design D-1〜D-7 / C-1〜C-9、functional-design Q1〜Q5、
> requirements A-1〜A-7 / OOS）でほぼ確定済みのため、再オープンしない。
> 確定済みとして扱う事項（質問しない）:
> - Secret 管理 = Secrets Manager 自動生成 + CloudFormation 動的参照で CloudFront カスタムヘッダと
>   Lambda 環境変数へ注入（D-2 — 注入先まで nfr-specification.md パターン表で確定済み）
> - アラーム 4 種のメトリクス・統計・閾値・評価期間・missing data 扱い（D-4）、通知 = SNS トピックのみ
>   CDK 作成・購読手動（D-5）
> - IAM = DynamoDB 5 アクション限定（QT-5）、CORS は API GW `corsPreflight` も撤去で 0 箇所
>   （functional-design Q2=a — IaC 側の撤去設計は本ステージ）
> - 実行基盤据置: Lambda 256MB/30s / DynamoDB オンデマンド + PITR / `TodoTable` 固定名 / 単一スタック
>   / ログ保持 90 日（C-1 / C-4）。WAF・X-Ray・ダッシュボードは対象外（C-8）
>
> 残る設問は、上流が決めていない**運用面の小さな裁量 2 点**のみ。

### Q1: execute-api 直接 URL の CfnOutput `ApiUrl` の扱い（AR-O2 / QT-4 導入後）

オリジン検証（QT-4）導入後、execute-api への直接アクセスは全操作 403 になります。現在 `ApiUrl` として
CfnOutput に出力されている直接 URL の扱いを決めてください。

a) 維持し、説明文を「オリジン検証により直接アクセスは 403（意図経路は CloudFront のみ）」へ更新する
b) CfnOutput を削除する（意図経路の単一性を出力面でも表現）
d) Other

**Trade Offs:** (a) は QT-4 の受入確認（直接アクセスが 403 になること）や障害切り分けの検証手段として
実用価値がある。URL 自体は秘密ではなく（コンソールで誰でも参照可能）、出力維持によるリスク増は実質ゼロ。
(b) は「直接 URL を広告しない」姿勢が構成に表れるが、QT-4 の動作確認のたびにコンソール往復が必要になり、
得られる防御は名目的（URL は秘匿情報ではない）。

**Recommendation:** a — 防御は BR-013（検証ミドルウェア）が実体であり、出力は検証・運用の道具として
残す方が QT-4 の確認可能性に効く。説明文更新で「意図した公開」を明文化する（AR-P2 (c) の記録価値と同旨）。

[Answer]: a — 維持し、説明文を「オリジン検証により直接アクセスは 403（意図経路は CloudFront のみ）」へ更新する。

### Q2: `logRetention` → 明示 `logGroup` 移行（RF-17 / AR-O7）後の旧 Lambda ロググループの扱い

明示 LogGroup（Lambda の LoggingConfig — CDK `logGroup` プロパティ。CDK 一意名で新規作成、保持 90 日、
RemovalPolicy.DESTROY）へ移行すると、logRetention カスタムリソースが消える一方、既存の
`/aws/lambda/<関数名>` ロググループはスタック管理外で残置されます（名前が異なるため衝突はしません。
既存の保持設定 90 日により旧ログは自然失効します）。

a) 残置を許容し、infrastructure-specification.md に注記のみ（旧ログは 90 日で自然失効・空グループの追加コストなし）
b) README のデプロイ手順に旧ロググループの手動削除 1 行を追加する
d) Other

**Trade Offs:** (a) は手動ステップを増やさず（運用制約「手動は SNS 購読とブランチ保護の 2 つのみ」を維持 —
RF-20 の 1 コマンドデプロイとも整合）、旧ログも保持設定どおり失効するため実害がない。アカウントに空の
ロググループが 1 つ残る美観上の問題のみ。(b) は即時にクリーンだが、手動ステップが 3 つに増え
nfr-design の運用制約と緊張する。削除タイミング（移行デプロイ後）を誤ると新ログと取り違えるリスクもある。

**Recommendation:** a — デモ単一環境（A-5）で実害ゼロ。手動ステップの追加を避ける方が上流制約と整合する。

[Answer]: a — 残置を許容し infrastructure-specification.md に注記のみ。旧ログは 90 日で自然失効、手動ステップを増やさない。

---

> 2026-06-10: 人間レビュー完了。Q1〜Q2 回答済み（全問 a を採択）。plan.md は提示のとおり承認され、成果物生成への着手が許可された。
