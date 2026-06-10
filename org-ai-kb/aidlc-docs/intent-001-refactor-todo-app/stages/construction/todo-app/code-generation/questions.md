# Questions — code-generation / unit: todo-app (UNIT-001)

> Stage: code-generation / Owner: aidlc-sw-dev-engineer-agent / 2026-06-10
> 上流（functional / nfr / infrastructure-design）で OQ-1〜3・申し送り 8 件はすべて解決済み（infrastructure-design 版 unit.md「OQ 解決状況 — 残余ゼロ確認」）。
> 本ステージの設問は、上流が code-generation へ明示委譲した裁量、または実装着手に必要な進め方の確認のみ（4 問）。
> 設計済み事項（CMP-003 公開面・dev 値 `local-dev-only`・ヘッダ名 `x-origin-verify`・CH-1〜10・IT-1〜10・アラームパラメータ等）は再決定しない。

### Q1: E2E（Playwright — RF-02）スイートの配置はどこにしますか？

a) ルート直下 `e2e/` ディレクトリ + ルート package.json の devDependencies（workspace パッケージは 4 のまま）
b) 第 5 の workspace パッケージ `packages/e2e` として新設
c) frontend パッケージ内（`packages/frontend/e2e/`）に同居
d) その他

**Trade Offs:** a は unit.md（blueprint）の「本 intent 完了時 4 workspace パッケージ」と QT-7「typecheck / test の対象 = shared 含む全 4 パッケージ」の記述をそのまま保存でき、`pnpm -r test`（unit テスト群）と E2E（CI の独立ジョブ）が構造的に分離される。b は依存・スクリプトの分離が最も明確だが blueprint の「4 パッケージ」記述と矛盾し、全 workspace 対象コマンドの定義に揺れを生む。c は同一パッケージ内で Vitest と Playwright のランナーが併存し設定が複雑化する。

**Recommendation:** a — blueprint identity（4 パッケージ）を保存しつつ、E2E はテストランナー分離（nfr-design Tech Stack の「Vitest と分離」）と CI 独立ジョブ化が自然に成立する。

[Answer]: a — ルート直下 e2e/ + ルート devDependencies。workspace パッケージは 4 のまま（blueprint 保存）。

### Q2: 依存メジャー更新（RF-18）の対象範囲はどうしますか？

a) nfr-design Tech Stack の到達点 4 系統のみ — Vitest 3 / Vite 7 / Biome 2 / CDK 現行版（完全固定維持）+ その peer 要件で必要になる随伴更新（@vitejs/plugin-react / jsdom 等）。その他の依存は既存レンジ内の lockfile 更新のみ
b) 全依存を最新メジャーへ一括更新（zod v4 は OOS-6 で除外）
c) その他

**Trade Offs:** a は BP-1（振る舞い保持）の回帰リスクを最小化し、残余の陳腐化は Renovate（RF-19）の定常 PR に委ねる設計とそのまま整合する。b は鮮度は最大だが、検証コストが増え「どこまで上げるか」の暗黙判断（React / Hono / AWS SDK / TypeScript 等）が本ステージに増殖する。

**Recommendation:** a — 到達点が nfr-design で明示された 4 系統に限定し、それ以外は RF-19 の仕組みに乗せる。

[Answer]: a — Vitest 3 / Vite 7 / Biome 2 / CDK 現行固定の 4 系統 + peer 随伴更新のみ。その他は Renovate（RF-19）に委ねる。

### Q3: フェーズ（P0 → P1 → P2）の進め方はどうしますか？

a) フェーズ境界で停止して報告する（P0 完了時・P1 完了時に orchestrator/人間がレビュー・コミットしてから次フェーズへ）
b) P0 → P1 → P2 を通しで実施し、最後にまとめて報告する
c) P0 完了時のみ停止（P1 → P2 は通しで実施）

**Trade Offs:** a は「P0 検証ゲート確立後、その保護下で P1/P2 を実施する」という unit-story-map.md の安全順序を人間確認込みで最も忠実に再現し、コミット粒度（git 操作は orchestrator 管轄）もフェーズ単位で揃う。b は最速だが、問題発覚時の切り戻し単位が大きくなる。c は中間。いずれでも plan.md のチェックボックスで進捗は可視化される。

**Recommendation:** a — 教材として「ゲートを作ってから保護下で変更する」過程そのものに価値があり、フェーズ単位のコミットはその記録になる。

[Answer]: a — フェーズ境界（P0 完了時・P1 完了時）で停止して報告。人間確認・コミット後に次フェーズへ。

### Q4: RF-22①③ に伴う v1 文書（ワークスペース直下 `aidlc-docs/`）の更新範囲はどうしますか？（units.md 申し送り #8 の委譲分）

a) ドリフト箇所のみピンポイント修正 — ① TodoForm のインライン編集 UX 記述、③ SDK 戦略の記述。② PUT 部分更新は v2（api-specification.md API-004）で正式文書化済みのため v1 側は該当記述の修正のみ
b) a に加えて、v1 文書の主要ファイル冒頭に「最新の設計の正は `org-ai-kb/aidlc-docs/intent-001-refactor-todo-app/` 配下」というバナー注記 1 行を追加
c) v1 文書全体を本 intent の結果で全面改訂
d) その他

**Trade Offs:** a は最小変更で RF-22 の受入（3 点の現状一致）を満たす。b は変更ファイル数が少し増えるが、教材利用者が v1/v2 どちらを正とすべきか迷わなくなる。c は RF-22 のスコープ（記述の現状一致）を超え、本 intent の変更対象外文書まで手が入る。

**Recommendation:** b — 修正は 3 点に限定しつつ、文書の正の所在を 1 行で明示するのが教材リポジトリとして親切。

[Answer]: b — ドリフト 3 点修正 + 主要ファイル冒頭に正の所在バナー 1 行を追加。

---

> 2026-06-10: 人間レビュー完了。Q1〜Q4 回答済み（Q1/Q2/Q3=a、Q4=b）。plan.md は提示のとおり承認され、P0 実装への着手が許可された。
> 補足（orchestrator 実測）: 着手前ベースラインは 38/45 テスト pass（infrastructure の todo-stack.test.ts 7 件が vitest ロードエラー `Cannot read properties of undefined (reading 'ESM')` で実行不能）、pnpm lint red（frontend/dist が lint 対象・organizeImports 数件・org-ai-kb JSON format）、frontend build red（TS2339: import.meta.env — vite/client 型未参照）。これらの修復は RF 作業の一部として本ステージで扱う。
