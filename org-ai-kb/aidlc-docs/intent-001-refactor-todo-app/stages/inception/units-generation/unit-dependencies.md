# Unit Dependencies — refactor-todo-app

> Stage: units-generation / Owner: aidlc-app-architect-agent
> 単一 unit 構成（Q1=a、units.md）のため **unit 間依存は存在しない**。テンプレートの各節は省略せず、「なし」の根拠と、construction が必要とする **unit 内 build 順序** を引き継ぎとして記録する。
> テンプレート逸脱の rationale: 単一 unit でも DEP-O1/O2（IaC が CMP-002 ソースをバンドルし CMP-001 dist を参照する結合実態）によるビルド順序制約は code-generation / infrastructure-design に必須の情報のため、Build Order 節を unit 内粒度（コンポーネント + 非コンポーネント要素）で拡張した。

## Dependency Matrix

| Dependency ID | Unit | Depends on | Dependency type | Integration mechanism |
|---|---|---|---|---|
| —（UDEP 採番なし） | UNIT-001 todo-app | （なし — 単一 unit） | none | — |

根拠: 全コンポーネント（CMP-001/002/003）と非コンポーネント要素 5 区分（IaC / CI / E2E / 開発環境 / 文書）が UNIT-001 に帰属する（units.md）。依存先となる他 unit が存在しないため、UDEP の採番対象はゼロ件。

## Build Order

**unit レベル**: UNIT-001 のみ — 順序問題なし。construction の fan-out は 1 周。

**unit 内（construction への引き継ぎ）** — デプロイ順序の最終決定は infrastructure-design の管轄。以下は components.yaml の依存と RE 観測（DEP-O1/O2）から導かれるビルド時の順序制約:

1. **CMP-003 Shared Contract** — 依存グラフの葉（被依存のみ）。CMP-001/CMP-002 が `workspace:` 依存でビルド時参照する（RF-03）ため最初に解決する（ビルド形態 = tsc ビルド or ソース直接参照は functional-design で決定 — units.md 申し送り #7）
2. **CMP-001 Todo Frontend / CMP-002 Todo Backend API** — CMP-003 解決後は相互独立（CMP-001 → CMP-002 は実行時 HTTP のみでコンパイル時依存なし）
3. **IaC バンドル**（`@todo-ai-dlc/infrastructure`） — CMP-002 のソースを直結バンドル（DEP-O1）し、CMP-001 の `dist/` を参照（DEP-O2）するため、両者のビルド成果物の後

検証ゲートの位置（RF-01/02 — P0）:

- **CI（RF-01）** は上記 1〜3 の全体（lint / typecheck / test は CMP-003 含む全 workspace パッケージ）+ `cdk synth` + `pnpm audit` を 1 ゲートに束ねる
- **E2E（RF-02）** は CMP-001 + CMP-002 の結合後（docker-compose 環境）で BT-1〜5 + BT-7 を検証し、CI に組み込まれる
- **RF-20（デプロイ手順のスクリプト化）** はこの暗黙順序（frontend build → cdk deploy）の明示化要件であり、本節の順序と整合する

## Parallelisation Opportunities

| Units | Can be built in parallel? | Reason |
|---|---|---|
| （unit 間） | 該当なし | 単一 unit のため対象なし |
| （unit 内）CMP-001, CMP-002 | yes | 相互にビルド時依存なし（実行時 HTTP のみ）。共有の先行物は CMP-003 のみ — CMP-003 解決後は並列ビルド可 |

## Integration Points

unit 間の runtime 統合点はなし。したがって **contract-design での unit 間契約定義は不要**（rationale: 契約の対象となる unit 境界が存在しない。frontend/backend 間のコントラクトは unit 内の関心であり、CMP-003 が単一ソースとして既に所有 — RF-03）。

| Dependency ID | From Unit | To Unit | Integration Need | Expected Contract |
|---|---|---|---|---|
| — | — | — | unit 間統合なし | —（contract-design の対象なし） |

参考（unit 内の統合点 — construction への文脈引き継ぎ。components.yaml の依存と一致）:

- CMP-001 → CMP-002: 実行時 HTTP（`/api`、JSON）で BT-1〜BT-5 の CRUD。コントラクトの単一ソースは CMP-003（RF-03）
- CMP-002 → 外部依存: DynamoDB TodoTable（永続化）/ CloudWatch Logs（構造化ログ・エラースタック出力 — RF-10/11）。いずれもコンポーネントではない（domain-design の規約ノートどおり）
