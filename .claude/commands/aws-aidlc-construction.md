---
description: AI-DLC CONSTRUCTION フェーズを実行。Inception成果物を元に、ユニット単位で設計→実装→ビルド・テストまで対話的に進める
argument-hint: [対象ユニット名や追加指示（省略可）]
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(git *), Bash(ls *), Bash(pnpm *), Bash(npm *), Bash(npx *), Bash(vitest *), Bash(go *), Bash(make *), Bash(cdk *), WebSearch, WebFetch, AskUserQuestion
---

# AI-DLC CONSTRUCTION Phase

現在のプロジェクトで CONSTRUCTION フェーズを実行してください。

ユーザーの追加指示: $ARGUMENTS

## 前提条件

CONSTRUCTION フェーズは INCEPTION フェーズ完了後に実行します。
`aidlc-docs/inception/` に Inception 成果物が存在することを確認してください。
存在しない場合は、ユーザーに `/aws-aidlc-inception` の実行を推奨してください。

## 最重要: ユーザーへの質問は AskUserQuestion を使う

**AI-DLC の question-format-guide.md が指示するファイルベースの質問形式（[Answer]: タグ）は無視してください。**

代わりに、ユーザーへの質問は全て `AskUserQuestion` ツールを使ってインタラクティブに行ってください:

- 選択肢がある質問 → AskUserQuestion の options で提示（最大4選択肢、最後に Other は自動付与）
- 複数選択可の質問 → multiSelect: true を使う
- 承認を求める場面 → AskUserQuestion で「承認する」「修正を依頼する」の2択
- 1回の呼び出しで最大4つの質問をまとめて聞ける

**ただし、設計ドキュメントや分析結果は従来通り `aidlc-docs/construction/` にファイルとして出力してください。** 質問のインタラクションだけを AskUserQuestion に置き換えます。

## 準備: AI-DLC ルールの読み込み

以下のファイルを順番に読み込み、ワークフローを理解してください:

1. **Core Workflow**: `.aidlc-workflows/aidlc-rules/aws-aidlc-rules/core-workflow.md`
2. **Common Rules（必須）**:
   - `.aidlc-workflows/aidlc-rules/aws-aidlc-rule-details/common/process-overview.md`
   - `.aidlc-workflows/aidlc-rules/aws-aidlc-rule-details/common/session-continuity.md`
   - `.aidlc-workflows/aidlc-rules/aws-aidlc-rule-details/common/content-validation.md`
   - `.aidlc-workflows/aidlc-rules/aws-aidlc-rule-details/common/welcome-message.md`
3. **Extensions（必須）**: `.aidlc-workflows/aidlc-rules/aws-aidlc-rule-details/extensions/` 配下の全 `.md` ファイルを再帰的にスキャン・読み込み
   - Extension ルールは cross-cutting constraints として全ステージに適用
   - 各ステージ完了時に extension rule compliance サマリを含める
   - `aidlc-docs/aidlc-state.md` の `## Extension Configuration` で Enabled/Disabled を確認し、Disabled の extension はスキップ（audit.md にスキップを記録）
4. **CONSTRUCTION Rule Details（各ステージ実行前に読む）**:
   - `.aidlc-workflows/aidlc-rules/aws-aidlc-rule-details/construction/functional-design.md`
   - `.aidlc-workflows/aidlc-rules/aws-aidlc-rule-details/construction/nfr-requirements.md`
   - `.aidlc-workflows/aidlc-rules/aws-aidlc-rule-details/construction/nfr-design.md`
   - `.aidlc-workflows/aidlc-rules/aws-aidlc-rule-details/construction/infrastructure-design.md`
   - `.aidlc-workflows/aidlc-rules/aws-aidlc-rule-details/construction/code-generation.md`
   - `.aidlc-workflows/aidlc-rules/aws-aidlc-rule-details/construction/build-and-test.md`

注意: `common/question-format-guide.md` はファイルベース形式の説明なので読み込み不要。

## Welcome Message

ワークフロー開始時に `common/welcome-message.md` の内容を **1回だけ** 表示してください。
INCEPTION フェーズからの継続（セッション再開）の場合は表示不要です。

## セッション再開チェック

1. `aidlc-docs/aidlc-state.md` を確認
2. CONSTRUCTION フェーズが途中の場合、AskUserQuestion で「前回から再開」「最初からやり直し」を選択させる
3. 再開の場合:
   - 完了済みステージをスキップし、未完了のステージから実行
   - **MANDATORY**: 前ステージの成果物を自動ロード:
     - Inception 成果物: requirements.md, stories.md, application-design artifacts, unit-of-work.md 等
     - Per-Unit Design: functional-design.md, nfr-requirements.md, nfr-design.md, infrastructure-design.md
     - Code Stages: 全コードファイル、プラン、および前の全成果物
   - ロードした成果物のサマリをユーザーに表示

## 実行フロー

core-workflow.md の CONSTRUCTION PHASE に従い、以下を実行:

### Phase 1: Inception 成果物の確認

1. `aidlc-docs/inception/` の成果物を読み込む
2. ユニット一覧（units）を特定する
3. 各ユニットに対する Workflow Planning の結果を確認し、どのステージを実行するか決定
4. **MANDATORY**: audit.md に Inception 成果物のロード結果を記録

### Phase 2: Per-Unit Loop（ユニットごとに繰り返し）

各ユニットに対して、Workflow Planning で決定されたステージを順番に実行。
**各ユニットを完全に（設計＋コード）完了してから次のユニットに移る。**

#### 1. Functional Design（条件付き）

**Execute IF**: 新しいデータモデル/スキーマ、複雑なビジネスロジック、ビジネスルールの詳細設計が必要
**Skip IF**: 単純なロジック変更、新しいビジネスロジックなし

- rule-details: `construction/functional-design.md` を実行前に読む
- 成果物: `aidlc-docs/construction/{unit-name}/functional-design/`
- **MANDATORY**: 標準 2 オプション完了メッセージを提示（rule file に定義された形式に従う）
- **Wait for Explicit Approval**: ユーザーが "Request Changes" か "Continue to Next Stage" を選択するまで進めない

#### 2. NFR Requirements（条件付き）

**Execute IF**: パフォーマンス要件、セキュリティ考慮、スケーラビリティ懸念、テックスタック選択が必要
**Skip IF**: 非機能要件なし、テックスタックが既に決定済み

- rule-details: `construction/nfr-requirements.md` を実行前に読む
- 成果物: `aidlc-docs/construction/{unit-name}/nfr-requirements/`
- **MANDATORY**: 標準 2 オプション完了メッセージを提示
- **Wait for Explicit Approval**

#### 3. NFR Design（条件付き）

**Execute IF**: NFR Requirements が実行された、NFR パターンの組み込みが必要
**Skip IF**: 非機能要件なし、NFR Requirements Assessment がスキップされた

- rule-details: `construction/nfr-design.md` を実行前に読む
- 成果物: `aidlc-docs/construction/{unit-name}/nfr-design/`
- **MANDATORY**: 標準 2 オプション完了メッセージを提示
- **Wait for Explicit Approval**

#### 4. Infrastructure Design（条件付き）

**Execute IF**: インフラサービスへのマッピングが必要、デプロイメントアーキテクチャ、クラウドリソース指定が必要
**Skip IF**: インフラ変更なし、インフラが既に定義済み

- rule-details: `construction/infrastructure-design.md` を実行前に読む
- 成果物: `aidlc-docs/construction/{unit-name}/infrastructure-design/`
- **MANDATORY**: 標準 2 オプション完了メッセージを提示
- **Wait for Explicit Approval**

#### 5. Code Generation（必須 — 常に実行）

**Code Generation は 1 ステージ内に 2 パートを持つ:**

**Part 1 - Planning**:
- 詳細なコード生成計画をチェックボックス付きで作成
- 計画: `aidlc-docs/construction/plans/{unit-name}-code-generation-plan.md`
- ユーザーの承認を得てから Part 2 へ

**Part 2 - Generation**:
- 承認された計画に従いコード、テスト、成果物を生成
- アプリケーションコード: Workspace root に配置（aidlc-docs/ には絶対置かない）
- ドキュメント: `aidlc-docs/construction/{unit-name}/code/`
- rule-details: `construction/code-generation.md` を実行前に読む
- **MANDATORY**: 標準 2 オプション完了メッセージを提示
- **Wait for Explicit Approval**

### Phase 3: Build and Test（全ユニット完了後 — 常に実行）

- rule-details: `construction/build-and-test.md` を実行前に読む
- 成果物ディレクトリ: `aidlc-docs/construction/build-and-test/`
- 以下を生成:
  - `build-instructions.md` — ビルド手順
  - `unit-test-instructions.md` — ユニットテスト実行手順
  - `integration-test-instructions.md` — 統合テスト手順
  - `performance-test-instructions.md` — パフォーマンステスト手順（該当時）
  - `build-and-test-summary.md` — テスト結果サマリ
- **Wait for Explicit Approval**: 「Build and test instructions complete. Ready to proceed to Operations stage?」

## コード配置ルール

- **アプリケーションコード** → Workspace root のみ（`aidlc-docs/` には絶対置かない）
- **設計ドキュメント** → `aidlc-docs/construction/` のみ
- **brownfield** → 既存のプロジェクト構造に従う
- **greenfield 単一ユニット** → `src/`, `tests/`, `config/`
- **greenfield マルチユニット（マイクロサービス）** → `{unit-name}/src/`, `{unit-name}/tests/`
- **greenfield マルチユニット（モノリス）** → `src/{unit-name}/`, `tests/{unit-name}/`

## 重要なルール

### ステージ実行

- 各ステージの rule-details は **実行直前** に読み込む（コンテキスト節約）
- 各ステージ完了後、**AskUserQuestion で承認を求める**（勝手に次のステージに進めない）
- **NO EMERGENT BEHAVIOR**: 完了メッセージは必ず標準 **2 オプション形式** を使用（rule file に定義された通り）。3 オプションメニューや独自のナビゲーションパターンを作らないこと
- 出力は全て `aidlc-docs/construction/` に配置

### チェックボックス追跡（2 レベル）

- **Plan-Level**: 計画ファイル内の `[ ]` → `[x]` を作業完了と **同じインタラクション内** で更新
- **Stage-Level**: `aidlc-docs/aidlc-state.md` でワークフロー全体の進捗を更新
- 例外なし: すべてのプランステップ完了はチェックボックス更新で追跡

### Audit Log

- `aidlc-docs/audit.md` への変更は **APPEND のみ**（ファイル全体の上書き厳禁）
- **MANDATORY**: すべてのユーザー入力を ISO 8601 タイムスタンプ付きで記録
- **MANDATORY**: ユーザーの **完全な RAW INPUT** をそのまま記録（要約・言い換え厳禁）
- **MANDATORY**: 承認プロンプト表示前にタイムスタンプ付きでログ
- **MANDATORY**: ユーザーの応答受信後にタイムスタンプ付きで記録
- フォーマット:
  ```
  ## [Stage Name]
  **Timestamp**: [ISO 8601]
  **User Input**: "[Complete raw user input]"
  **AI Response**: "[AI's response or action taken]"
  **Context**: [Stage, action, or decision made]
  ---
  ```

### コンテンツバリデーション

- Mermaid 構文を検証してからファイルに書き込む
- ASCII 図は `common/ascii-diagram-standards.md` に準拠
- 特殊文字のエスケープ確認
- 複雑なビジュアル要素にはテキスト代替を提供

### その他

- 曖昧な回答（depends, maybe, not sure, standard, typical 等）にはフォローアップ質問を実施
- 日本語で対話する
