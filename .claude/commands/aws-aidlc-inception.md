---
description: AI-DLC INCEPTION フェーズを実行。現在のプロジェクトを分析し、要件定義→設計→Unit分解まで対話的に進める
argument-hint: [構築したいものの説明（省略可）]
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(git *), Bash(ls *), WebSearch, WebFetch, AskUserQuestion
---

# AI-DLC INCEPTION Phase

現在のプロジェクトで INCEPTION フェーズを実行してください。

ユーザーの初期要求: $ARGUMENTS

$ARGUMENTS が空の場合は、Workspace Detection 後にユーザーへ「何を構築しますか？」と質問してください。

## 最重要: ユーザーへの質問は AskUserQuestion を使う

**AI-DLC の question-format-guide.md が指示するファイルベースの質問形式（[Answer]: タグ）は無視してください。**

代わりに、ユーザーへの質問は全て `AskUserQuestion` ツールを使ってインタラクティブに行ってください:

- 選択肢がある質問 → AskUserQuestion の options で提示（最大4選択肢、最後に Other は自動付与）
- 複数選択可の質問 → multiSelect: true を使う
- 承認を求める場面 → AskUserQuestion で「承認する」「修正を依頼する」の2択
- 1回の呼び出しで最大4つの質問をまとめて聞ける

**例**: Requirements Analysis の質問フェーズでは、質問ファイルを作る代わりに:
```
AskUserQuestion([
  { question: "開発の主な目的は？", options: ["新機能", "改善", "外部連携", "インフラ"] },
  { question: "変更対象の領域は？", options: ["Frontend", "Backend", "Infra", "全体"], multiSelect: true }
])
```

**ただし、設計ドキュメントや分析結果は従来通り `aidlc-docs/inception/` にファイルとして出力してください。** 質問のインタラクションだけを AskUserQuestion に置き換えます。

## 準備: AI-DLC ルールの読み込み

以下のファイルを順番に読み込み、ワークフローを理解してください:

1. **Core Workflow**: `.aidlc-workflows/aidlc-rules/aws-aidlc-rules/core-workflow.md`
2. **Common Rules（必須）**:
   - `.aidlc-workflows/aidlc-rules/aws-aidlc-rule-details/common/process-overview.md`
   - `.aidlc-workflows/aidlc-rules/aws-aidlc-rule-details/common/session-continuity.md`
   - `.aidlc-workflows/aidlc-rules/aws-aidlc-rule-details/common/content-validation.md`
   - `.aidlc-workflows/aidlc-rules/aws-aidlc-rule-details/common/welcome-message.md`
3. **INCEPTION Rule Details（各ステージ実行前に読む）**:
   - `.aidlc-workflows/aidlc-rules/aws-aidlc-rule-details/inception/`

注意: `common/question-format-guide.md` はファイルベース形式の説明なので読み込み不要。

## 実行フロー

core-workflow.md の INCEPTION PHASE に従い、以下を順番に実行:

1. **Welcome Message** を表示
2. **Workspace Detection** — プロジェクトのコードベースをスキャン
3. **Reverse Engineering** — brownfield の場合のみ
4. **Requirements Analysis** — 要件分析（深度はプロジェクト複雑度に応じて適応的に）
5. **User Stories** — 条件に合致すれば実行
6. **Workflow Planning** — 全フェーズの実行計画
7. **Application Design** — 条件に合致すれば実行
8. **Units Generation** — 複数ユニットが必要な場合

## 重要なルール

- 各ステージの rule-details は **実行直前** に読み込む（コンテキスト節約）
- 各ステージ完了後、**AskUserQuestion で承認を求める**（勝手に進めない）
- 出力は全て `aidlc-docs/inception/` に配置
- `aidlc-docs/aidlc-state.md` と `aidlc-docs/audit.md` を適切に更新
- コンテンツバリデーション（Mermaid構文、ASCII図）を必ず実施
- 日本語で対話する
