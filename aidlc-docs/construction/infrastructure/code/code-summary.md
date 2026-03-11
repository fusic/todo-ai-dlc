# Infrastructure Code Generation Summary

## Generated Files

### CDK Code (`packages/infrastructure/`)

| File | Purpose |
|---|---|
| `bin/app.ts` | CDK App エントリーポイント（TodoStack インスタンス化） |
| `lib/todo-stack.ts` | メイン CDK スタック（全 AWS リソース定義） |

### Tests

| File | Test Count |
|---|---|
| `test/todo-stack.test.ts` | 7 テスト（DynamoDB, Lambda, S3, CloudFront, API Gateway, Outputs） |

### Configuration

| File | Purpose |
|---|---|
| `package.json` | CDK 依存関係、scripts |
| `tsconfig.json` | TypeScript 設定 |
| `cdk.json` | CDK 設定（tsx で実行） |
| `vitest.config.ts` | テスト設定 |

## AWS Resources Created

| Resource | CDK Construct | Key Properties |
|---|---|---|
| **DynamoDB Table** | `dynamodb.Table` | On-Demand, PITR enabled, DESTROY |
| **Lambda Function** | `NodejsFunction` | Node.js 20, 256MB, 30s, esbuild ESM |
| **HTTP API** | `apigatewayv2.HttpApi` | CORS enabled, Lambda proxy |
| **API Access Log** | `logs.LogGroup` | 90-day retention |
| **S3 Bucket** | `s3.Bucket` | Block all public access, SSE-S3 |
| **CloudFront** | `cloudfront.Distribution` | S3 OAC + API Gateway origins |
| **Response Headers** | `cloudfront.ResponseHeadersPolicy` | CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy |
| **S3 Deployment** | `s3deploy.BucketDeployment` | Frontend dist → S3 |

## Stack Outputs

| Output | Description |
|---|---|
| `CloudFrontUrl` | CloudFront Distribution URL |
| `ApiUrl` | API Gateway HTTP API URL |
| `TableName` | DynamoDB Table Name |

## Security Compliance

| Rule | Status | Implementation |
|---|---|---|
| SECURITY-01 | Compliant | DynamoDB 暗号化（default）, S3 SSE-S3 |
| SECURITY-02 | Compliant | API Gateway access logging → CloudWatch |
| SECURITY-04 | Compliant | CloudFront ResponseHeadersPolicy（CSP, HSTS, etc.） |
| SECURITY-06 | Compliant | `grantReadWriteData()` で最小権限 |
| SECURITY-07 | Compliant | S3 BlockPublicAccess.BLOCK_ALL + OAC |
| SECURITY-09 | Compliant | S3 block public access, no default credentials |
| SECURITY-10 | Compliant | CDK version pinned to 2.177.0 |
| SECURITY-14 | Compliant | Lambda logRetention: THREE_MONTHS (90 days) |
