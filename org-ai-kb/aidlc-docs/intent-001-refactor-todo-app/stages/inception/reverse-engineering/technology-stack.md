# Technology Stack

> Stage: reverse-engineering / Owner: aidlc-systems-architect-agent
> バージョンは「宣言（package.json）→ 解決（pnpm-lock.yaml）」を併記。caret range のため宣言と解決の差が大きいものがある。

## Programming Languages

| Language | Version | Usage |
|---|---|---|
| TypeScript | 宣言 ^5.7.0 → 解決 5.9.3（strict mode、共有 tsconfig: ES2022 / bundler resolution / isolatedModules） | 全 3 パッケージ + CDK |
| HTML / CSS | — | `index.html`（SPA シェル）、`index.css`（Tailwind import のみ） |

実行ランタイム: Node.js 20（Lambda `NODEJS_20_X` / Dockerfile.dev `node:20-slim` / esbuild target `node20` で一貫）。

## Frameworks

| Framework | Version | Purpose |
|---|---|---|
| Hono | ^4.6.0 → 4.12.7 | backend Web フレームワーク（`hono/aws-lambda` で Lambda 適合、cors / logger ミドルウェア） |
| React | ^19.0.0 → 19.2.x | frontend UI（StrictMode、hooks のみ。状態管理・ルーティングライブラリなし） |
| Tailwind CSS | ^4.0.0 → 4.2.1 | スタイリング（v4 CSS-first 構成、`@tailwindcss/vite` プラグイン） |
| AWS CDK (aws-cdk-lib) | 2.177.0（**完全固定**） | IaC フレームワーク（L2 constructs、NodejsFunction） |
| zod | ^3.24.0 → 3.25.76 | API 入力検証（backend のみ） |

## Infrastructure Services

| Service | Provider | Purpose |
|---|---|---|
| AWS Lambda | AWS | API 実行基盤（Node.js 20、256MB、30s、ESM バンドル、source map 有効） |
| Amazon API Gateway (HTTP API) | AWS | REST 受け口（`/{proxy+}` ANY、$default ステージ、アクセスログ有効） |
| Amazon DynamoDB | AWS | データストア（TodoTable、オンデマンド、PITR、AWS managed 暗号化） |
| Amazon S3 | AWS | SPA 静的ホスティング（全公開ブロック、SSE-S3、autoDeleteObjects） |
| Amazon CloudFront | AWS | CDN・TLS 終端・セキュリティヘッダ・`/api/*` ルーティング（PriceClass_200） |
| Amazon CloudWatch Logs | AWS | Lambda ログ + API GW アクセスログ（保持 90 日 — SECURITY-14） |
| DynamoDB Local + aws-cli | ローカル（Docker） | 開発用 DynamoDB（in-memory）とテーブル初期化 |

## Build Tools

| Tool | Version | Purpose |
|---|---|---|
| pnpm | 9.15.0（packageManager 固定、corepack） | workspace 管理・タスク実行 |
| Vite | ^6.0.0 → 6.4.1 | frontend dev server（:3000、`/api` proxy）+ 本番ビルド |
| esbuild（NodejsFunction 経由） | CDK 同梱 | backend の Lambda バンドル（ESM、minify、`@aws-sdk/*` 外部化） |
| tsx | ^4.19.0 → 4.21.0 | backend dev 実行（watch）・CDK app 実行 |
| Biome | 1.9.4 | lint + format + import 整理（tab / double quote / lineWidth 100） |
| Docker / docker-compose | Dockerfile.dev: node:20-slim | ローカル開発環境（README は Rancher Desktop 標準） |

## Testing Tools

| Tool | Version | Purpose | Scope |
|---|---|---|---|
| Vitest | ^2.1.0 → 2.1.9 | テストランナー（globals、各パッケージ個別設定） | unit（全 45 ケース） |
| @testing-library/react + jest-dom | ^16.1.0 / ^6.6.0 | コンポーネントテスト | frontend unit（17 ケース） |
| jsdom | ^25.0.0 → 25.0.1 | frontend テスト環境 | frontend |
| aws-cdk-lib/assertions (Template) | 2.177.0 | CloudFormation テンプレート検証 | infrastructure（7 ケース） |
| @vitest/coverage-v8 | （backend 設定のみ） | カバレッジ計測 | backend のみ設定 |

## Observability

| Tool | Purpose | Scope |
|---|---|---|
| hono/logger | リクエストログ（**プレーンテキスト**。コメントの「structured logging」とは乖離 — AR-O4） | backend（Lambda / ローカル共通） |
| API Gateway アクセスログ | 構造化（JSON フォーマット定義: requestId/ip/method/path/status/responseLength） | API GW $default ステージ |
| CloudWatch Logs | ログ集約（保持 90 日、Lambda は `--enable-source-maps` でスタックトレース可読化） | Lambda / API GW |
| （なし） | メトリクスアラーム / X-Ray トレーシング / ダッシュボード / RUM | — |

---

## Observations（観測事項 — 事実の記録）

| # | 観測事項 | 根拠 |
|---|---|---|
| TS-O1 | 依存方針が二極化: CDK のみ完全固定（2.177.0、SECURITY-10 意図）、他はすべて caret range。結果として宣言と解決の乖離が大きい（hono ^4.6.0→4.12.7、TS ^5.7→5.9.3、SDK ^3.700→3.1007 等） | 各 package.json vs pnpm-lock.yaml |
| TS-O2 | 主要依存の現行メジャーからの遅れ: zod 3 系（現行 4 系）、Vitest 2 系（現行 3 系）、Vite 6 系（現行 7 系）、Biome 1.9（現行 2 系）、CDK 2.177（2025-01 リリース、以降の deprecation 対応 AR-O7 が未適用） | pnpm-lock.yaml、各プロジェクトのリリース状況 |
| TS-O3 | Lambda バンドルは `externalModules: ["@aws-sdk/*"]` のため、**実行時 SDK はランタイム同梱版**となり、ローカル/テストで解決される 3.1007.0 と一致する保証がない | `lib/todo-stack.ts:47`、`backend/package.json` |
| TS-O4 | TypeScript strict mode・ESM（type: module）・ES2022 が 3 パッケージで一貫しており、ツールチェーン（pnpm/Biome/Vitest/tsx）も統一されている。技術スタックの一貫性は高い | ルート tsconfig.json、各 package.json |
| TS-O5 | lockfile に react 19.2.4 と 19.2.14 が併存（インストール時期差による重複解決） | pnpm-lock.yaml |
| TS-O6 | 観測性スタックは「ログのみ」。NFR-001（API 500ms 以内）を計測する仕組み（メトリクス/アラーム）が存在しない | `lib/todo-stack.ts`、v1 requirements.md NFR-001 |

## Refactoring Proposals（リファクタリング提案 — 下流ステージの判断材料）

| # | 提案 | 対応する観測 | トレードオフ |
|---|---|---|---|
| TS-P1 | 依存更新の方針を明文化して一括更新: CDK を現行 2.x へ（deprecated プロパティ移行 AR-P5 と同時）、Vitest 3 / Vite 7 / Biome 2 へメジャー更新。Renovate/Dependabot で継続化 | TS-O1, TS-O2 | メジャー更新は設定マイグレーションを伴う（Biome 2 は config 変換、Vitest 3 は軽微）。教材の鮮度維持に直結 |
| TS-P2 | zod v4 移行を独立タスクとして評価（`flatten()` → `z.treeifyError` 等の API 変更、`@hono/zod-validator` 併用時の互換性確認） | TS-O2 | 破壊的変更が API エラーレスポンス形状（API 契約）に波及し得るため、API-P4/P6 と同時設計が安全 |
| TS-P3 | Lambda の SDK バージョン戦略を明示: externalModules 維持（コールドスタート優先・現状）か、SDK をバンドルに含めてバージョン固定（再現性優先）かを決定し記録する | TS-O3 | バンドル同梱はパッケージサイズ増・コールドスタート微増。現状維持なら「ランタイム同梱版に依存」と文書化 |
| TS-P4 | 構造化ログ導入（hono/logger を JSON ロガー、または AWS Lambda Powertools Logger へ置換）し、SECURITY-03 のコメントと実態を一致させる | TS-O6, AR-O4 | Powertools は依存追加だがメトリクス/トレースへの拡張路線が得られる |
| TS-P5 | NFR-001 検証手段として CloudWatch アラーム（Lambda Duration/Errors、API GW 5xx/Latency）を CDK に追加（AR-P6 と同一） | TS-O6 | 微小なコスト増。NFR がコードで検証可能になる |
