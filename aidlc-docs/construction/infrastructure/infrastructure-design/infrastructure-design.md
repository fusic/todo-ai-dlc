# Infrastructure Design - infrastructure

> **Note**: 本ドキュメントは v1（初期構築時）の記録です。最新の設計の正は `org-ai-kb/aidlc-docs/intent-001-refactor-todo-app/` 配下を参照してください。

## Overview

TODO Web アプリケーションの AWS インフラストラクチャ設計。全リソースを単一 CDK スタックで管理。

## Cloud Provider
- **Provider**: AWS
- **Region**: ap-northeast-1 (Tokyo)
- **IaC Tool**: AWS CDK v2 (TypeScript)

## Infrastructure Components

### 1. DynamoDB Table

| Property | Value |
|---|---|
| **Table Name** | `TodoTable` |
| **Partition Key** | `id` (String) |
| **Billing Mode** | PAY_PER_REQUEST (On-Demand) |
| **Encryption** | AWS managed key (default) — SECURITY-01 |
| **Point-in-Time Recovery** | Enabled |
| **Removal Policy** | DESTROY（デモ用途） |

### 2. Lambda Function

| Property | Value |
|---|---|
| **Function Name** | `TodoApiFunction` |
| **Runtime** | Node.js 20.x |
| **Handler** | `index.handler` |
| **Memory** | 256 MB |
| **Timeout** | 30 seconds |
| **Entry** | `packages/backend/src/index.ts` |
| **Bundling** | esbuild (CDK NodejsFunction) |
| **Environment Variables** | `TABLE_NAME`, `NODE_OPTIONS=--enable-source-maps` |
| **Log Retention** | 90 days — SECURITY-14 |

### 3. API Gateway (HTTP API)

| Property | Value |
|---|---|
| **Type** | HTTP API (API Gateway v2) |
| **Integration** | Lambda Proxy |
| **CORS** | Enabled（全オリジン許可 — デモ用途） |
| **Throttling** | Default（10,000 req/s） |
| **Access Logging** | Enabled — SECURITY-02 |
| **Stage** | `$default` (auto-deploy) |

### 4. S3 Bucket (Frontend Static Hosting)

| Property | Value |
|---|---|
| **Bucket Name** | Auto-generated |
| **Public Access** | Blocked — SECURITY-09 |
| **Encryption** | S3 managed key (SSE-S3) — SECURITY-01 |
| **Versioning** | Disabled（デモ用途） |
| **Removal Policy** | DESTROY + Auto-delete objects |
| **Access** | CloudFront OAC only — SECURITY-07 |

### 5. CloudFront Distribution

| Property | Value |
|---|---|
| **Origin 1** | S3 (OAC) — 静的ファイル |
| **Origin 2** | API Gateway — `/api/*` パス |
| **Default Behavior** | S3 origin（SPA） |
| **API Behavior** | API Gateway origin（`/api/*`） |
| **Viewer Protocol** | HTTPS only（redirect） |
| **Cache Policy** | CachingOptimized (S3), CachingDisabled (API) |
| **Error Pages** | 403/404 → `/index.html`（SPA fallback） |
| **Response Headers** | Security headers policy — SECURITY-04 |
| **Price Class** | PriceClass_200 |

### 6. IAM Roles — SECURITY-06

**Lambda Execution Role**:
- `dynamodb:GetItem` on TodoTable
- `dynamodb:PutItem` on TodoTable
- `dynamodb:UpdateItem` on TodoTable
- `dynamodb:DeleteItem` on TodoTable
- `dynamodb:Scan` on TodoTable
- CloudWatch Logs（自動付与）

## Security Compliance Summary

| Rule | Status | Notes |
|---|---|---|
| SECURITY-01 | Compliant | DynamoDB: AWS managed encryption. S3: SSE-S3. All traffic over HTTPS |
| SECURITY-02 | Compliant | API Gateway access logging enabled |
| SECURITY-03 | Compliant | Lambda CloudWatch Logs + Hono logger |
| SECURITY-04 | Compliant | CloudFront response headers policy (CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy) |
| SECURITY-05 | N/A | Infrastructure layer — handled in backend code |
| SECURITY-06 | Compliant | Lambda role: specific DynamoDB actions on specific table ARN |
| SECURITY-07 | Compliant | S3 block public access + CloudFront OAC only |
| SECURITY-08 | N/A | 認証なし（デモ用途） |
| SECURITY-09 | Compliant | S3 block public access, CloudFront error pages, no default credentials |
| SECURITY-10 | Compliant | pnpm lock file, pinned CDK dependencies |
| SECURITY-11 | N/A | Infrastructure layer |
| SECURITY-12 | N/A | 認証なし（デモ用途） |
| SECURITY-13 | N/A | No external CDN scripts |
| SECURITY-14 | Compliant | CloudWatch log retention: 90 days |
| SECURITY-15 | N/A | Infrastructure layer |
