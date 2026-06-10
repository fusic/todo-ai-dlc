# Intent: refactor-todo-app

## Verbatim Prompt

> ai-dlc-v2でこのプロジェクトをリファクタリングしてください

（補足確認の結果: 対象は `packages/` 配下の TODO アプリケーションコード。AI-DLC v2 ワークフローを通してリファクタリングを実施する）

## Summary

AI-DLC v1 で構築された TODO アプリケーション（pnpm monorepo: Hono backend / React 19 + Vite frontend / AWS CDK infrastructure）を、AI-DLC v2 のアダプティブワークフローを通してリファクタリングする。Brownfield のリファクタリング intent。

## Slug

`refactor-todo-app`

## Type

brownfield-refactoring

## Workspace Facts

- プロジェクトルート: `/Users/seike460/src/github.com/fusic/todo-ai-dlc`
- 既存 v1 成果物: `aidlc-docs/inception/`（requirements, application-design）、`aidlc-docs/construction/`（plans, code summaries, infrastructure-design）
- コード: `packages/backend`（Hono）、`packages/frontend`（React 19 + Vite）、`packages/infrastructure`（AWS CDK 2.177）
- テスト: vitest（各パッケージに *.test.ts / *.test.tsx あり）
- v2 フレームワークソース: `/Users/seike460/src/github.com/awslabs/aidlc-workflows/kiro/src/`（v2 ブランチ）
