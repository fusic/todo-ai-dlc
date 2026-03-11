# todo-ai-dlc

TODO 管理アプリケーション（React + Hono + DynamoDB）

## ローカル開発環境（Rancher Desktop / Docker）

### 前提条件

- [Rancher Desktop](https://rancherdesktop.io/) または Docker Desktop
  - Rancher Desktop の場合、Container Engine は **dockerd (moby)** を推奨
- Git

### セットアップ

```bash
git clone <repository-url>
cd todo-ai-dlc
cp .env.example .env  # 必要に応じて編集
docker compose up --build
```

### アクセス URL

| サービス | URL |
|----------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001 |
| DynamoDB Local | http://localhost:8000 |

### 停止

```bash
docker compose down          # コンテナ停止
docker compose down -v       # コンテナ停止 + データリセット（volumes 削除）
```

### Windows（WSL2）での開発

WSL2 上で利用する場合、以下の点に注意してください：

1. **プロジェクトは WSL2 ネイティブ FS に clone する**（`/home/user/...` 配下）。`/mnt/c/...` に置くと bind mount のパフォーマンスが大幅に低下します
2. **hot-reload が動かない場合**は、polling モードを有効にしてください：
   ```bash
   VITE_USE_POLLING=true docker compose up --build
   ```

### ホスト直接での開発

Docker を使わずにホストで直接開発する場合：

```bash
pnpm install
pnpm run dev          # Frontend 起動
# 別ターミナルで
pnpm --filter @todo-ai-dlc/backend dev   # Backend 起動
```

Backend から DynamoDB Local に接続する場合は、別途 DynamoDB Local を起動し `DYNAMODB_ENDPOINT=http://localhost:8000` を設定してください。

## テスト

```bash
pnpm -r test
```

## プロジェクト構成

```
packages/
  ├── backend/        # Hono API サーバー (DynamoDB)
  ├── frontend/       # React + Vite + Tailwind CSS
  └── infrastructure/ # AWS CDK
```

## AIDLC ワークフロー（任意）

AI-DLC による開発ワークフローを使用する場合：

```bash
git clone https://github.com/awslabs/aidlc-workflows.git .aidlc-workflows
```

Claude Code で `/aws-aidlc-inception` `/aws-aidlc-construction` コマンドが利用可能になります。
