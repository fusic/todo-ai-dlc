# Final Review — infrastructure-design / unit: todo-app (UNIT-001)

> Reviewer: aidlc-architecture-reviewer-agent / 2026-06-10
> 対象: 本ステージ全 5 ファイル（questions.md / plan.md / infrastructure-specification.md / components.yaml / unit.md）
> 突合先: stage definition + template（infrastructure-specification.md）、nfr-design 全成果物 + 最終レビュー（N-1〜N-6）、
> functional-design rules.yaml / api-specification.md、units-generation unit-dependencies.md、RE architecture.md、
> v1 設計 `aidlc-docs/construction/infrastructure/infrastructure-design/infrastructure-design.md` §6、
> workflow/state、および**実コード**（`packages/infrastructure/lib/todo-stack.ts` / `bin/app.ts` / `cdk.json`）

## Verdict: **ready**

ブロッキングな gap はない。低重要度の指摘 2 件（I-1, I-2）と記録 3 件（I-3〜I-5）を残す。いずれも code-generation が誤読しなければ実害がないレベルで、修正イテレーションを要求しない。

---

## 1. 検証したこと（証跡）

### 1.1 実コードとの突合 — 変更明細 CH-1〜CH-10 の行参照を全件照合

| 変更明細の主張 | 実コード確認結果 |
|---|---|
| CH-1: `todo-stack.ts:27` `pointInTimeRecovery: true` | **一致**（deprecated 使用の現存を確認） |
| CH-2: `todo-stack.ts:49` `logRetention: RetentionDays.THREE_MONTHS` | **一致** |
| CH-3: `todo-stack.ts:53` `grantReadWriteData()`（SECURITY-06 コメント付き — 「コメント維持・実態一致」の前提も正確） | **一致**（:52-53） |
| CH-4: `todo-stack.ts:63-67` `corsPreflight` ブロック | **一致**（allowOrigins `*` の現状も RF-12 の解消対象として整合） |
| CH-6: `todo-stack.ts:143` `new origins.HttpOrigin(apiDomain)` | **一致** |
| CH-7: `todo-stack.ts:38-41` `environment`（TABLE_NAME / NODE_OPTIONS のみ） | **一致**（components.yaml の Environment 行とも一致） |
| CH-9: `todo-stack.ts:194-197` `ApiUrl` CfnOutput | **一致** |
| 据置宣言（DynamoDB キー・課金・Lambda 256MB/30s/ESM・/{proxy+} ANY・ApiAccessLog JSON・OAC・CSP・errorResponses・PriceClass） | **全件一致**（:23-28, 32-50, 70-74, 85-95, 100-101, 116, 139, 163-177） |
| unit.md IaC モジュール参照: `bin/app.ts`（`npx tsx`）/ ap-northeast-1 | **一致**（`cdk.json:2` = `npx tsx bin/app.ts`、`app.ts` region 既定 `ap-northeast-1`） |
| QT-5 の回帰先 = v1 設計 §6 の 5 アクション | **一致**（v1 §6 は GetItem/PutItem/UpdateItem/DeleteItem/Scan + Logs 自動付与 — CH-3 と字句一致） |

### 1.2 技術的妥当性（額面で受け取らない検証）

- `secret.secretValue.unsafeUnwrap()` は同一スタック生成 Secret では `{{resolve:secretsmanager:...}}` 動的参照としてテンプレートに現れる — IT-3〜IT-5 の assert 設計は実装可能で正確
- CloudFront のオリジンカスタムヘッダは**同名の viewer ヘッダを上書きする**ため、CloudFront 経由での `x-origin-verify` 偽装は成立しない。直接 execute-api への偽装は Secret 値の知識を要する — QT-4 の防御モデルは成立
- 動的参照はデプロイ時解決のため Lambda 実行ロールに secretsmanager 実行時権限が不要 — 最小権限の主張は正確
- `httpApi.metricLatency()` / `metricServerError()`（ApiId 次元）、`todoFunction.metricDuration()` / `metricErrors()`、`Table.grant(grantee, ...actions)` — いずれも実在する CDK API。アラーム 4 種・IAM 5 アクション grant は記述どおり実装可能
- 明示 `logGroup` 渡しで `Custom::LogRetention` が消える（IT-8）/ `pointInTimeRecoverySpecification` が現行 API（CH-1）— 正確
- 条件付き書込（BR-007）が UpdateItem/DeleteItem の ConditionExpression で追加 IAM アクション不要 — 正確（IT-1「ちょうど 5 アクション」と矛盾しない）
- ローカル開発・GSI なしテーブル・単一 Lambda 構成等、前提に隠れた依存なし

### 1.3 copy-forward の blueprint identity（diff による検証)

- **components.yaml**: nfr-design 版との diff = ヘッダ追記 + 各 CMP への `Infrastructure-Mappings` ブロックのみ。**削除 0 行**。Id / Name / Unit / Behaviour-summary / Responsibilities / Boundaries / Source / Dependency / Dependent-Component / Entities / Functional-Design-References / NFR-Annotations 完全不変 — pass
- **unit.md**: **削除 0 行**。nfr-design 版全節を保存し、デプロイトポロジー / IaC モジュール参照 / ランタイム構成 / 運用所有 / OQ 残余ゼロ確認の 5 節 + ヘッダのみ追記 — pass

### 1.4 上流との突合（再決定ゼロ・申し送り閉鎖の確認）

- **D-1〜D-7 / QT-1〜9 / C-1〜C-9**: 全件「翻訳のみ」を確認。アラームパラメータ（p95>500 3/3、p99>1500 3/3、Errors≥1 1/1、5xx≥1 1/1、period 5 分、notBreaching）は D-4 と完全一致し、infrastructure-specification.md / components.yaml / unit.md の 3 箇所で相互に矛盾なし。本ステージの新規決定は Q1/Q2（人間承認済み）と命名（ヘッダ名 / 環境変数名 / Secret 文字集合 / アラーム ID）のみ — セルフチェック記録の主張どおり
- **OQ-1〜OQ-3**: nfr-design api-specification.md の解決状況表と突合 — 委譲残余（construct 設計 / アラームリソース定義）は本ステージで全件着地。「未解決 OQ ゼロ」の主張は正確
- **DEP-O1/O2**（unit-dependencies.md）: `frontend build → cdk synth/deploy` の順序制約 + 「CI の synth ジョブも frontend build 先行」の code-generation への必須引き継ぎ — 原文と整合
- **AR 参照**（RE architecture.md）: AR-O2（ApiUrl 直接到達）/ AR-O3（IAM ドリフト）/ AR-O4（構造化ログの実態）/ AR-O7（deprecated 2 箇所）/ AR-O10（CSP）/ AR-P2（意図経路の決定提案）— 全件原文と一致。AR-O3/O7 は本ステージで解消設計済み
- **C-1〜C-9 遵守**: 基盤値変更ゼロ・手動ステップ 2 つ維持（Q2=a で 3 つ目を回避）・スコープ外リソース（WAF/X-Ray/ダッシュボード/複数環境）追加ゼロ・CDK 固定方針維持 — 違反なし
- **nfr-design 最終レビュー N-1〜N-6**: いずれも nfr-design 側ファイルの字句指摘であり、本ステージの copy-forward 対象 2 ファイルには該当箇所なし（N-2 の api-specification.md は本ステージの成果物に含まれない — definition 上も要求されない）。持ち越し義務なし

### 1.5 規約・テンプレート・work method 準拠

- definition 宣言の 3 成果物すべて作成済み。テンプレート 7 節（Service Mapping / Compute / Network Topology / Security Boundaries / Observability / Deployment Strategy / Copied Blueprint Expansions）全節あり + 拡張 4 節（construct 設計 / 変更明細 / テスト assert / トレーサビリティ）— 拡張はテンプレートの「extended as needed」の範囲
- questions.md: 2 問とも選択肢 / Trade Offs / Recommendation / [Answer] あり、人間レビュー完了の記録あり
- plan.md: Artifact Resolution 表あり（contracts/ 不存在の fallback を文書化 — work method 準拠）。全チェックボックス [x]
- state.json: 本ステージ outputs に 5 ファイル全件が規約形式で登録済み。contributors は definition どおり (none)

## 2. Findings（non-blocking）

### I-1（低 / コスト記載の精度）: パーセンタイル統計アラームの料金

「コスト増分」節の「アラーム 4 本（無料枠 10 本内 / 超過時 $0.10/本）」について — CloudWatch の公称価格ではパーセンタイル統計（p95/p99）のアラームは標準の $0.10 ではなく **$0.30/本/月** で課金され、無料枠 10 本の適用にも条件がある。アラーム 4 本中 2 本が該当するため、最悪 +$0.6〜1.2/月 程度の過小見積りの可能性がある。「Secrets Manager のみ有意」という結論の桁は変わらず設計判断にも影響しないが、字句は「パーセンタイルアラームは $0.30/本の可能性あり」へ精緻化するのが正確。次回 touch 時の字句修正で足りる（code-generation での実測確認でも可）。

### I-2（低 / 運用上の主張のわずかな過大表現）: Secret 値変更時の再配布

Security Boundaries「ローテーション特性」行の「値変更時は再デプロイで CloudFront / Lambda 両方へ再配布される（動的参照はデプロイ時解決）」— CloudFormation の動的参照は**当該プロパティを含むリソースが更新される場合にのみ**再解決される。テンプレート無変更の `cdk deploy` は no-op となり再解決されない。自動ローテーションを構成しない本設計では実害はないが、README / 運用手順へこの文言がそのまま転記されると誤った運用知識になる。「値変更時はテンプレート変更を伴う再デプロイ（または当該リソースの更新）で再配布」への精緻化を推奨。

### I-3（記録 / 規約の字句）: questions.md の選択肢レタリング

Q1 / Q2 とも選択肢が a) b) d) と c) を飛ばしている（question-format.md の例示は a〜d 連番で d = Other）。意図（d = Other の慣習維持）は読み取れ、回答・反映に影響なし。記録のみ。

### I-4（記録 / 名称の二重性）: HTTP API の表記

Service Mapping は「API Gateway HTTP API（TodoApi）」と **apiName** で表記するが、CDK construct ID は `TodoHttpApi`（`todo-stack.ts:61`）。CH/IT は行参照・リソース型で一意に特定できるため誤読リスクは小さいが、code-generation は construct ID を `TodoApi` へ「揃える」変更をしないこと（論理 ID 変更 = API 置換 = エンドポイント URL 変化を招く）。本レビューで明文化しておく。

### I-5（記録 / 暗黙の前提の明名）: 動的参照の解決値はサービス設定上で可視

`ORIGIN_VERIFY_SECRET`（Lambda 環境変数）と `x-origin-verify`（CloudFront オリジンカスタムヘッダ）の解決値は、デプロイ後の各サービス設定（コンソール / GetFunctionConfiguration 等）では平文で参照可能。QT-4 の保護目標は「リポジトリ・synth テンプレートに平文 0 件」とスコープされており違反ではなく、D-2（上流決定）の既知特性だが、成果物に明示されていない前提として記録する（AWS アカウントへの読取アクセス = Secret 可視、という境界）。

## 3. 特に良い点（code-generation への引き継ぎ品質）

- 変更明細 CH-1〜CH-10 が現行コードの行参照付きで、テスト assert IT-1〜IT-10 が QT/RF へ遡及付きで対になっている — code-generation は「何を変え、何で検証するか」を再導出する必要がない
- 「変更しないもの（据置の明示）」の列挙が brownfield 設計のドリフト防止として機能している（C-1/BP-1 の検証可能化）
- ヘッダ名 / 環境変数名という 3 実装箇所（ミドルウェア / ローカル注入 / IaC）が共有する契約値を本ステージで確定させた判断は、後続の整合性リスクを正しく潰している
- Q1（ApiUrl 維持）の「意図した公開の明文化」は AR-P2 (c) の記録価値を (a) 採用後も引き継いでおり、RE からの一貫性がある

## 4. 結論

- **completeness**: 宣言成果物 3/3 + questions/plan。テンプレート全節 + 拡張。RF-12/14/15/16/17/20 の IaC 側着地と残余委譲先に未処置なし — pass
- **coherence**: 3 成果物間（アラームパラメータ / 契約値 / 手動ステップ数 / 新規リソース 4 区分）に矛盾なし。実コード・RE・v1 設計・nfr-design との事実不一致なし（I-1/I-2 は字句精度レベル） — pass
- **traceability**: copy-forward 2 ファイルの identity を diff で確認（削除 0 行）。CH → RF/QT/Q、IT → QT/RF、残余 → code-generation がすべて追跡可能 — pass

**verdict: ready** — I-1〜I-5 は次に該当ファイルへ触れる際の軽微修正・実装時の留意で足り、code-generation への進行を妨げない。
