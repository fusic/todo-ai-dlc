# Plan — domain-design

> Stage: domain-design / Owner: aidlc-app-architect-agent
> 成果物: `components.yaml`（機械可読カタログ）+ `components.md`（mermaid 図 + サマリー表 + 根拠）
> 方針: brownfield-refactoring（BP-1 振る舞い保持）のため、**現状の論理構造を正とした再記述 + RF が要求する構造変化（RF-03 shared 新設）の反映**を基本線とする。デプロイトポロジー（モノリス/分割等）は決めない — units-generation の管轄。

## 入力と Artifact Resolution の記録

- **Required `requirements.md`**: `/stages/inception/requirements-analysis/requirements.md`（人間承認済み。FR-001〜004 / RF-01〜22 / NFR-001〜007 / BP-1 / A-1〜7 / OOS-1〜10）を使用
- **Optional `stories.md`**: 本 intent では存在しない（requirements-analysis は validate-and-augment 方式で stories を生成していない）。**fallback**: business-overview.md の Business Transactions（BT-1〜BT-7）を Source.Stories の代替参照として使用し、components.yaml の Source には `Stories` の代わりに BT 参照を記録する
- **RE 成果物**: architecture.md（現状コンポーネント記述・依存方向・データフロー）、code-structure.md（モジュール階層・設計パターン・CS-O1/O2 型重複）、business-overview.md（BT 表・Business Dictionary・Todo エンティティ属性）、dependencies.md（内部依存グラフ DEP-O1/O2）を使用。api-documentation.md / technology-stack.md は contract・制約値の確認用
- v1 application-design は参照しない（RE 成果物が現状を正として再記述済みのため。RF-22 のドキュメント更新対象として components.md から言及はする）

## コンポーネント候補（questions.md の回答で確定）

Q1=a / Q2=a / Q3=a（推奨）の場合:

| 仮 ID | 名称 | 由来 | 主な Source |
|---|---|---|---|
| CMP-001 | Todo Frontend (SPA) | 既存 `@todo-ai-dlc/frontend` の論理再記述 | FR-001〜004、BT-1〜5、RF-05/06/08/09/13 |
| CMP-002 | Todo Backend API | 既存 `@todo-ai-dlc/backend` の論理再記述。**Todo エンティティ（ENT-001）の所有者** | FR-001〜004、BT-1〜7、RF-04/06/07/10/11/12 |
| CMP-003 | Shared Contract | RF-03 による新設 `@todo-ai-dlc/shared`。コントラクト定義（型・zod schema・制約定数 200/1000）の単一ソース | RF-03、NFR-004 |

依存方向（予定）: CMP-001 → CMP-002（HTTP `/api`、実行時）、CMP-001 → CMP-003（型・定数 import）、CMP-002 → CMP-003（schema・`z.infer` 型導出）。DynamoDB / CloudWatch はコンポーネントではなく CMP-002 の依存として記述。

非コンポーネント要素（Q3=a の場合、components.md の専用節に記録）: IaC（RF-14〜17）、CI/E2E（RF-01/02）、依存管理・デプロイ・ローカル環境（RF-18〜21）、文書（RF-22）。

## 手順

### 1. Plan and clarify（本タスク）

- [x] requirements.md（RF-01〜22 / BP-1 / 優先度 P0〜P2）を読了
- [x] RE 成果物（architecture / code-structure / business-overview / dependencies）から現状の論理構造・依存方向・エンティティ属性を抽出
- [x] コンポーネント分割の判断点を 3 点（粒度 / shared の位置づけと entity 所有 / クロスカット要素）に絞り込み
- [x] `questions.md` を question-format.md 形式で作成
- [x] `plan.md`（本書）を作成
- [x] state.json の domain-design を `clarification-asked` に更新

### 2. Review answers and decide（回答受領後）

- [x] questions.md の回答（Q1〜Q3）を読み、コンポーネント構成を確定する（Q1=a / Q2=a / Q3=a — 本 plan の候補構成と完全一致、追加質問なし）
- [x] 回答が本 plan の候補構成と異なる場合は本書のコンポーネント候補表と手順 3 を改訂する（改訂不要 — 候補構成のまま確定）

### 3. components.yaml の作成

- [x] テンプレート（stages/domain-design/templates/components.yaml）に従い、確定した各コンポーネントを記述する
- [x] 各コンポーネントに stable ID（CMP-xxx）を採番する（以後のステージで不変。units-generation がこの ID を参照する）
- [x] `Behaviour-summary` / `Responsibilities`: RE の現状記述（business-overview.md の Component-Level Business Descriptions）を正として、技術非依存の業務能力として記述する。RF が振る舞いに追加するもの（例: RF-05 エラー表示、RF-06 表示順保証）は responsibilities に反映する
- [x] `Boundaries`: 所有しないもの（例: frontend は業務ルールの強制を所有しない / backend は表示を所有しない / shared は実行時振る舞いを所有しない）と、コンポーネント内部の実装構造（routes→handlers→repositories 等）が境界ではないことを明記する
- [x] `Source`: 各コンポーネントへ FR / RF / NFR / BP-1 の該当 ID を記録する（Stories の代替として BT-1〜7 を参照）
- [x] `Dependency` / `Dependent-Component`: CMP 間の依存（方向と Interaction 理由）を記述する。DynamoDB・CloudWatch 等の非コンポーネント依存は Behaviour/Boundaries 側に依存として記す
- [x] `Entities`: ENT-xxx を採番し、Todo（id / title / description / completed / createdAt / updatedAt — business-overview.md の Business Dictionary を典拠）を所有者コンポーネント（Q2 の回答に従う）に配置する。属性の制約（200/1000、ULID、ISO 8601）も記録する
- [x] エンティティ所有の一意性チェック: すべての ENT が exactly 1 コンポーネントに属することを確認する（ENT-001 → CMP-002 のみ）

### 4. components.md の作成

- [x] mermaid コンポーネント図（CMP 間の呼出方向 + ラベル付きエッジ。外部依存 DynamoDB は依存として点線表示）を作成する（mmdc で構文検証済み）
- [x] Component Summary 表（ID / 名称 / 能力 / 依存 / 所有エンティティ）を作成する
- [x] Rationale 表: 各コンポーネントが独立コンポーネントである根拠（変更レート・データ所有・関心の違い）を記述する。「現状境界の保持」がリファクタリング intent の判断であることを明記する
- [x] **RF トレーサビリティ表**: RF-01〜22 の全件を「担当コンポーネント or 非コンポーネント要素」へマッピングし、漏れゼロを確認する（BP-1・NFR-005〜007 の対応も付記。22/22 着地済み）
- [x] Q3 の回答に従い「非コンポーネント要素」節（IaC / CI / E2E / 開発環境 / 文書 — units-generation への引き継ぎ事項）を記述する
- [x] 設計ステージへ委譲済みの未決事項（RF-06 の実現箇所＝API かフロントか、RF-16 のローカル経路方式 等）を「下流への申し送り」として明記する（domain-design では決めない — 申し送り 8 件）

### 5. セルフチェックと完了処理

- [x] components.yaml と components.md の内容一致（同一データの 2 ビュー）を確認する（yaml は機械可読性検証済み — 3 documents、双方向依存整合）
- [x] ステージ定義との適合確認: コンポーネントはすべて「書くコード」であり、DB・インフラがコンポーネントとして混入していないこと、デプロイトポロジーを決めていないことを確認する
- [x] BP-1 整合確認: コンポーネント境界の変更が RF-03（shared 新設）のみであり、既存の外部振る舞い（BT-1〜7）の記述が RE と一致することを確認する
- [x] 本 plan のチェックボックスを更新し、state.json の domain-design を `artifact-generated` に更新、outputs に components.yaml / components.md を登録する
