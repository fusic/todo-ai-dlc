# Final Review — nfr-design / unit: todo-app (UNIT-001)

> Reviewer: aidlc-architecture-reviewer-agent / 2026-06-10
> 対象: 本ステージ全 6 ファイル（questions.md / plan.md / nfr-specification.md / components.yaml / unit.md / api-specification.md）
> 突合先: stage definition + template（nfr-specification.md）、requirements.md（refined 版 — NFR-001〜007 / RF / BP-1 / A / OOS）、
> functional-design 全成果物 + 最終レビュー（F-1〜F-5）、RE technology-stack.md / architecture.md、
> workflow.json / state.json、および **実コードベース**（packages/ 配下・Dockerfile.dev・docker-compose.yml）

## Verdict: **ready**

ブロッキングな gap はない。低重要度の指摘 4 件（N-1〜N-4）と字句レベルの記録 2 件（N-5〜N-6）を下記に残す。いずれも infrastructure-design / code-generation が誤読しなければ実害がないレベルであり、修正イテレーションを要求しない。

---

## 1. 検証したこと（証跡）

### 1.1 コードベース・既存基盤との突合（記述の正確性 — 額面で受け取らない検証）

| 成果物の主張 | 実コード・実構成での確認結果 |
|---|---|
| C-1: Lambda 256MB / 30s 据置 | **一致**。`packages/infrastructure/lib/todo-stack.ts:36-37`（`memorySize: 256` / `timeout: 30s`） |
| QT-5 の前提: 現状 IAM は `grantReadWriteData()`（RF-14 のドリフト解消対象） | **一致**。`todo-stack.ts:53` |
| C-1: ログ保持 90 日 / PITR | **一致**。`todo-stack.ts:49`（`RetentionDays.THREE_MONTHS` — RF-17 の `logRetention` deprecated 移行対象であることも整合）/ `todo-stack.ts:27`（`pointInTimeRecovery: true`） |
| D-6 の前提: 現状は `hono/logger`（プレーンテキスト → Powertools 置換） | **一致**。`packages/backend/src/index.ts:3,11` |
| タイムアウト規定「API GW **HTTP API** 統合 30s」 | **一致**。`todo-stack.ts:61`（`apigatewayv2.HttpApi` — HTTP API の統合タイムアウト上限 30s と整合） |
| Powertools の「esbuild バンドルで実質サイズ増は小」の前提 | **一致**。`todo-stack.ts:32`（`NodejsFunction` = esbuild バンドル） |
| C-7: `node:20-slim` ベースイメージ（Vite 7 エンジン要件の確認対象） | **一致**。`Dockerfile.dev:1` |
| CMP-001 Security: CSP `connect-src 'self'` 維持（AR-O10） | **一致**。`todo-stack.ts:116` |
| D-7 の前提: 既存 data-testid を Playwright locator に流用可 | **一致**。frontend 4 コンポーネント（App / TodoList / TodoItem / TodoForm）に data-testid が現存 |
| D-1 の前提: docker-compose / Vite proxy のローカル経路 | **一致**。`docker-compose.yml` + `packages/frontend/vite.config.ts:13`（proxy） |

技術事実の妥当性確認: Lambda `Duration` メトリクスが Init フェーズを含まない（QT-1 の根拠）/ API GW Latency が経路全体値（QT-2 の根拠）/ CloudFormation 動的参照で Secrets Manager 値を CloudFront オリジンカスタムヘッダ・Lambda 環境へ注入可能（D-2）/ CDK が SSM SecureString の作成に非対応（Q2 代替案 b の却下理由）/ pnpm `auditConfig.ignoreCves`（C-6）/ Secrets Manager 約 $0.40/月（D-2）/ 条件付き書込が UpdateItem / DeleteItem の `ConditionExpression` で追加 IAM アクション不要（QT-5）— いずれも正確。

### 1.2 copy-forward の blueprint identity（diff による検証）

- **components.yaml**: functional-design 版との diff = ヘッダ追記 + 各 CMP への `NFR-Annotations` ブロックのみ。**削除 0 行**。CMP Id / Name / Unit / Behaviour-summary / Responsibilities / Boundaries / Source / Dependency / Dependent-Component / Entities / Functional-Design-References は完全不変 — pass
- **unit.md**: **削除 0 行**。functional-design 版の全節を保存し、NFR Posture / 技術選定 / 運用制約 / 申し送り #3/#4/#6 解決の 4 節のみ追記 — pass
- **api-specification.md**: 削除はタイトル行のステージ表記 1 行のみ（plan.md Step 7 の自己申告どおり）。functional-design ヘッダは「＜functional-design 時点のヘッダ（保存）＞」として保存。操作仕様・Payload・Versioning・Open Questions 原本は不変。追記は NFR Annotations / OQ 解決状況の 2 節のみ — pass

### 1.3 上流との突合（トレーサビリティ / 申し送りの解決）

- **NFR-001〜007 の全件着地**: NFR-001→QT-1/QT-2、NFR-002→QT-3、NFR-003→QT-4/QT-5、NFR-004→QT-7 + Tech Stack（RF-18 行）、NFR-005→QT-6、NFR-006→QT-7、NFR-007→QT-8。宙に浮いた NFR なし。フロント初回ロード 3 秒の除外は requirements の字句（「本 intent では計測対象外」「RUM 等は OOS-9」）と正確に一致し、省略の rationale も QT-1 / 省略事項に記録済み — pass
- **OQ-1〜OQ-3（units.md 申し送り #3/#4/#6）の全件解決**: D-1〜D-5 で決定し、残余（construct 構成 / workflow 実装 / アラームリソース定義）の委譲先が unit.md・api-specification.md の両方に明記 — pass
- **上流レビュー F-2 / F-3 への対応**: F-2（RF-11 のラベル揺れ → BR-012 との分担明記）と F-3（BR-013 字句緊張 → D-2 + C-5 で解消）が nfr-specification.md「上流申し送りへの対応」節で処置済み。BR-012 / BR-013 の rules.yaml 原文と突合し、二重定義なし・字句充足（本番値は平文 0 件）を確認 — pass
- **RF 非機能側のトレーサビリティ表**: RF-01/02/10/11/14/15/16/18/19（+ RF-20/21 の関与分）の着地と残余委譲先を独立に再検証。RF-15 受入基準の「500ms との整合」は QT-2 が整合根拠の文書化（受入基準が要求する形式）で満たしている。RF-16 受入基準の解釈（C-5: 「本番ヘッダ値は」）は requirements の確定済み保護目標（「リポジトリへの平文コミット防止まで」）の範囲内で、人間承認済み（Q1=a）— pass
- **CI 6 ジョブの構成**: RF-01 の 5 種（lint / typecheck / test / synth / audit）+ RF-02 の E2E = 6 で QT-7 と一致。audit 閾値（D-3）は RF-01 の設計委譲句どおり本ステージで決定 — pass

### 1.4 規約・テンプレート・work method 準拠

- stage definition 宣言の 4 成果物すべて作成済み。テンプレートの 7 節（Quality Targets / Tech Stack / Patterns / Blueprint Annotations / API Quality Annotations / Component Quality Annotations / Trade-offs / Constraints）全節あり + 拡張 3 節（F-2/F-3 対応・トレーサビリティ）
- QT-n というステージローカル ID 系列の採用は requirements NFR-00n との衝突回避として冒頭で宣言され、Source 列で全行が NFR-00n / RF-xx へ遡及する — テンプレートの「NFR-n」からの逸脱は rationale 付きで許容
- questions.md は question-format.md 準拠（全 7 問に選択肢 / Trade Offs / Recommendation / [Answer]、人間レビュー完了の記録あり）
- plan.md: Artifact Resolution 表あり（contract-design skip の fallback を上流 plan と同一方針で継続 — work method「Document the fallback」準拠）。全チェックボックス [x]
- state.json: 本ステージ outputs に 6 ファイル全件が規約形式で登録済み。contributors は definition どおり (none)（contribution ファイル不在は構成どおり）

## 2. Findings（non-blocking）

### N-1（低 / 番号衝突の自己警告に対する例外）: nfr-specification.md 内の無修飾な上流 Q 参照

questions.md 冒頭が「Q 番号はステージローカル系列 — 誤読注意」と自ら警告しているにもかかわらず、nfr-specification.md QT-5 Rationale の「ドリフト解消 — **Q1=c**」と QT-7 Rationale の「要件の優先順位（**Q4=c**）」は **requirements ステージの Q1=c / Q4=c** を無修飾で参照している。本ステージの Q1 / Q4 は「=a」のため、字句どおり読むと矛盾に見える。「requirements Q1=c」のように修飾すれば解消する。次回 touch 時の字句修正で足りる。

### N-2（低 / copy-forward 固有の文脈ずれ）: api-specification.md 通信前提の「Q2=a（本ステージ決定）」

原本（functional-design）の通信前提表にある「Q2=a（**本ステージ**決定）」が、nfr-design 版のタイトル下では本ステージ＝nfr-design（Q2=a = Secrets Manager）と誤読し得る。原本ヘッダが「＜functional-design 時点のヘッダ（保存）＞」として保存されているため文脈は復元可能であり、blueprint identity（原本不変）を優先した判断として妥当。記録のみ。

### N-3（低 / トレーサビリティの弱い対応）: QT-9 の Source に NFR-002

QT-9（更新・削除のアトミック性）の Source は「BP-1 / RF-07 / NFR-002」だが、NFR-002 は可用性（マネージドサービス SLA）であり、requirements 上の RF-07 の v1 対応は FR-003/004。実質の根拠は BP-1 / RF-07 で十分であり、NFR-002 の併記は牽強。削除または FR-003/004 への差替えが正確。

### N-4（低 / ターゲット字句のわずかな過大表現）: QT-6 の「SNS 通知到達」

QT-6 のターゲットは「アラーム 4 種 + **SNS 通知到達**」だが、D-5 の決定（購読は手動）により、構成として自動保証されるのは「トピック存在 + アラームアクション接続」まで（Measure 列はその範囲で正確に書かれている）。未購読時に通知が届かないことはパターン表の failure mode に明記済みのため実害はないが、ターゲット字句は「SNS 通知**経路の構成**」がより正確。

### N-5（記録 / 編集残渣）: plan.md Step 5 の文末

Step 5 のチェック項目末尾「…新節方式を採用） **or** infrastructure-design へ残余委譲を明記」に、テンプレート選択肢の編集残渣と思われる「or」断片が残っている。成果物の実体（unit.md は両方とも実施済み）に影響なし。

### N-6（記録 / 字句）: questions.md Q4 Trade Offs に他言語グリフ混入

「RF-15 受入基準が**명시**的に回避を要求」— 「明示的」の誤変換。意味は文脈から自明。

## 3. 特に良い点（後続ステージへの引き継ぎ品質）

- 全決定が D-1〜D-7 の決定 ID で索引化され、QT / Patterns / Constraints / copy-forward 注釈 / 残余委譲のすべてが同じ ID で遡及できる — infrastructure-design が「なぜこの構成か」を再発見する必要がない
- QT-1/QT-2 の主従分離（Lambda Duration p95 = NFR-001 の正式計測点 / API GW Latency p99 = 緩和した経路検知）は、メトリクス定義（Init 含む/含まない）という事実に基づいており、RF-15 受入基準の「誤報しない設計」要求への回答として正確
- D-1（フェイルオープン経路の排除）と E2E BT-7 の回帰検知器としての接続が、BR-013 violation 欄の字句と完全に噛み合っている
- 上流レビュー F-2/F-3 が専用節で名指しで処置され、「対応したつもり」ではなく検証可能な形（分担の明文化 / C-5 の 2 文）で閉じている

## 4. 結論

- **completeness**: 宣言成果物 4/4 + questions/plan。テンプレート全節 + 拡張。NFR-001〜007 / OQ-1〜3 / F-2〜F-3 に未処置なし — pass
- **coherence**: BR-012/013 と二重定義なし。決定（D-1〜D-7）・QT・パターン・注釈・委譲の相互参照に切れなし。コードベース・RE・requirements との事実不一致なし（N-1〜N-4 は字句・対応関係レベル） — pass
- **traceability**: copy-forward 3 ファイルの blueprint identity を diff で確認（削除 0 行 / タイトル 1 行のみ）。QT → NFR/RF、決定 → 残余委譲先がすべて追跡可能 — pass

**verdict: ready** — N-1〜N-6 は次に該当ファイルへ触れる際の軽微修正で足り、infrastructure-design への進行を妨げない。
