# Build Instructions

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| **Node.js** | >= 20.x | `mise install node@20` |
| **pnpm** | >= 9.15.0 | `corepack enable && corepack prepare pnpm@9.15.0 --activate` |
| **AWS CDK CLI** | >= 2.177.0 | `pnpm install` でローカルインストール |
| **AWS CLI** | >= 2.x | CDK デプロイ時に必要 |
| **AWS Credentials** | - | `aws configure` または環境変数 |

## Build Steps

### 1. Install Dependencies

```bash
# プロジェクトルートで実行
pnpm install
```

### 2. Type Check（全パッケージ）

```bash
# 全パッケージの型チェック
pnpm -r typecheck
```

### 3. Lint and Format Check

```bash
# Biome による lint + format チェック
pnpm run lint
```

自動修正する場合：
```bash
pnpm run lint:fix
```

### 4. Build Frontend

```bash
# Frontend のビルド（Vite で SPA をバンドル）
pnpm --filter @todo-ai-dlc/frontend build
```

**Build Artifacts**: `packages/frontend/dist/`

### 5. CDK Synth（インフラ検証）

```bash
# CDK テンプレートの合成（デプロイなし）
cd packages/infrastructure
npx cdk synth
```

**Build Artifacts**: `packages/infrastructure/cdk.out/`

Note: Backend の Lambda バンドリングは CDK が esbuild で自動処理します。

### 6. Verify Build Success

- `packages/frontend/dist/index.html` が存在すること
- `packages/infrastructure/cdk.out/TodoStack.template.json` が存在すること
- 型エラー、lint エラーがないこと

## Troubleshooting

### pnpm install が失敗する
- **Cause**: Node.js バージョンが古い、pnpm がインストールされていない
- **Solution**: `mise install node@20` && `corepack enable`

### TypeScript コンパイルエラー
- **Cause**: 型の不整合
- **Solution**: `pnpm -r typecheck` で詳細エラーを確認

### CDK synth が失敗する
- **Cause**: AWS credentials 未設定、CDK bootstrap 未実行
- **Solution**: `aws configure` → `cd packages/infrastructure && npx cdk bootstrap`
