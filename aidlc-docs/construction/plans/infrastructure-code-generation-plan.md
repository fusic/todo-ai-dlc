# Infrastructure Code Generation Plan

## Unit Context

| Property | Value |
|---|---|
| **Unit** | infrastructure |
| **Package Path** | `packages/infrastructure/` |
| **Framework** | AWS CDK v2 (TypeScript) |
| **Stack** | TodoStack（単一スタック） |

## Dependencies
- **Depends On**: backend（build artifact）, frontend（build artifact）
- **Depended By**: なし

## Requirements Coverage
- FR-001〜FR-004: DynamoDB Table + Lambda + API Gateway + S3 + CloudFront（全 CRUD 機能のホスティング基盤）

## Infrastructure Design Reference
- `aidlc-docs/construction/infrastructure/infrastructure-design/infrastructure-design.md`
- `aidlc-docs/construction/infrastructure/infrastructure-design/deployment-architecture.md`

## Security Extension Compliance
- SECURITY-01: DynamoDB 暗号化 + S3 SSE-S3 + HTTPS
- SECURITY-02: API Gateway access logging
- SECURITY-04: CloudFront response headers policy
- SECURITY-06: Lambda IAM least privilege（table-scoped actions）
- SECURITY-07: S3 block public access + OAC
- SECURITY-09: S3 block public access, no default creds
- SECURITY-10: pnpm lock file, pinned CDK deps
- SECURITY-14: CloudWatch log retention 90 days

## Generation Steps

### Step 1: Infrastructure Package Setup
- [x] `packages/infrastructure/package.json` — CDK 依存関係
- [x] `packages/infrastructure/tsconfig.json` — TypeScript 設定
- [x] `packages/infrastructure/cdk.json` — CDK 設定

### Step 2: CDK App Entry Point
- [x] `packages/infrastructure/bin/app.ts` — CDK App + TodoStack インスタンス化

### Step 3: TodoStack — Main CDK Stack
- [x] `packages/infrastructure/lib/todo-stack.ts`
  - DynamoDB Table（On-Demand, PITR, DESTROY）
  - Lambda Function（NodejsFunction, 256MB, 30s, esbuild ESM）
  - HTTP API Gateway（Lambda integration, CORS, access logging）
  - S3 Bucket（block public access, SSE-S3, auto-delete）
  - CloudFront Distribution（S3 OAC + API Gateway origins, security headers, SPA fallback）
  - S3 BucketDeployment（frontend build 成果物をアップロード）
  - CfnOutput（CloudFront URL, API URL, TableName）
  - IAM least privilege（SECURITY-06: grantReadWriteData）

### Step 4: CDK Stack Test
- [x] `packages/infrastructure/test/todo-stack.test.ts`
  - DynamoDB Table on-demand billing + PITR 確認
  - Lambda Function 設定確認（Runtime, Memory, Timeout）
  - S3 Bucket block public access 確認
  - CloudFront Distribution 存在確認
  - API Gateway HTTP API 存在確認
  - Stack Outputs 確認

### Step 5: Infrastructure Code Summary Document
- [x] `aidlc-docs/construction/infrastructure/code/code-summary.md`

## Total Steps: 5
## Estimated Files: ~7 ファイル（CDK コード 3 + テスト 1 + 設定 3）
