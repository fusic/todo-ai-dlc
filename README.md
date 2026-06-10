# todo-ai-dlc

TODO 管理アプリケーション（React + Hono + DynamoDB）

## 前提条件

| ツール | 必須 | 備考 |
|--------|------|------|
| [Rancher Desktop](https://rancherdesktop.io/) | **必須** | Container Engine は **dockerd (moby)** を選択してください。Docker Desktop でも代替可能ですが、本プロジェクトでは Rancher Desktop を標準としています |
| [Node.js](https://nodejs.org/) 20+ | ホスト直接開発時 | Docker のみで開発する場合は不要 |
| [pnpm](https://pnpm.io/) 9.15+ | ホスト直接開発時 | `corepack enable` で有効化 |
| Git | **必須** | |

## ローカル開発環境（Rancher Desktop / Docker）

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
pnpm -r test        # unit テスト（shared / backend / frontend / infrastructure）
pnpm typecheck      # 全 workspace の tsc --noEmit
pnpm lint           # biome check
```

### E2E スモークテスト（Playwright）

docker compose 環境（フロントエンド http://localhost:3000）に対して BT-1〜5 の 1 周 + ヘルスチェックを実行します。

```bash
docker compose up -d --build   # 環境起動（初回は数分かかります）
pnpm exec playwright install chromium   # 初回のみ
pnpm test:e2e
docker compose down            # 終了後
```

## CI とブランチ保護（RF-01 / RF-02）

`.github/workflows/ci.yml` が push / pull request で 6 種の検証ゲート（lint / typecheck / test / cdk synth / pnpm audit / E2E）を実行します。**main に入るすべての変更はこのゲートを通過させてください。** GitHub リポジトリ設定でブランチ保護を有効化します（手動ステップ）:

1. Settings → Branches → Add branch protection rule（Branch name pattern: `main`）
2. 「Require status checks to pass before merging」を有効化し、CI の 6 ジョブ（lint / typecheck / test / synth / audit / e2e）を required checks に指定
3. 「Require a pull request before merging」を有効化（main への直接 push を遮断）

`pnpm audit` で修正不能な上流 advisory が出た場合は、`pnpm-workspace.yaml` / `package.json` の `auditConfig.ignoreGhsas` に理由コメント付きで個別 ignore し、依存更新で解消され次第削除します。

## プロジェクト構成

```
packages/
  ├── shared/         # 共有コントラクト（型・zod schema・制約定数 — RF-03）
  ├── backend/        # Hono API サーバー (DynamoDB)
  ├── frontend/       # React + Vite + Tailwind CSS
  └── infrastructure/ # AWS CDK
e2e/                  # Playwright E2E スモークテスト（docker compose 環境で実行）
```

## AIDLC ワークフロー（必須）

本プロジェクトでは [AI-DLC（AI Development Lifecycle）](https://github.com/awslabs/aidlc-workflows) ワークフローを採用しています。要件定義・設計・実装のすべてのフェーズで AIDLC を使用するため、開発開始前に必ずセットアップしてください。

### セットアップ

```bash
git clone https://github.com/awslabs/aidlc-workflows.git .aidlc-workflows
```

### 利用方法

**Claude Code** では以下のコマンドが利用可能になります：

- `/aws-aidlc-inception` — 要件定義・設計フェーズ（Inception）
- `/aws-aidlc-construction` — 実装・テストフェーズ（Construction）

**Codex** で同等の Skill を使う場合は、repo 内の定義を `~/.codex/skills` に連携します：

```bash
bash scripts/install-codex-skills.sh
```

必要に応じて `CODEX_SKILLS_HOME=/path/to/skills` で導入先を切り替えられます。導入後は Codex を再起動すると `aws-aidlc-inception` と `aws-aidlc-construction` が利用可能になります。

### AIDLC 成果物

AIDLC ワークフローの成果物は `aidlc-docs/` に格納されます：

```
aidlc-docs/
  ├── inception/         # 要件定義・アプリケーション設計
  │   ├── requirements/  # 要件定義
  │   ├── application-design/  # コンポーネント設計・サービス定義
  │   └── plans/         # 実行計画
  └── construction/      # 実装成果物
      ├── plans/         # コード生成計画
      ├── backend/       # Backend 実装サマリー
      ├── frontend/      # Frontend 実装サマリー
      ├── infrastructure/ # インフラ設計・実装サマリー
      └── build-and-test/ # ビルド・テスト手順
```
