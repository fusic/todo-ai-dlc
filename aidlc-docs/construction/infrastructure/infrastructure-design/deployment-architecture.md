# Deployment Architecture

## Architecture Diagram

```
+------------------------------------------------------------------+
|                        CloudFront Distribution                    |
|  +--------------------+  +------------------------------------+  |
|  | Default Behavior   |  | /api/* Behavior                    |  |
|  | Origin: S3 (OAC)   |  | Origin: API Gateway HTTP API       |  |
|  | Cache: Optimized    |  | Cache: Disabled                    |  |
|  +--------+-----------+  +------------------+-----------------+  |
+-----------|------------------------------+--+-----------------+--+
            |                              |
            v                              v
+-----------+-----------+  +---------------+------------------+
|                       |  |                                  |
|   S3 Bucket           |  |   API Gateway (HTTP API)         |
|   (Frontend Static)   |  |   - CORS enabled                 |
|   - Block Public      |  |   - Access logging               |
|   - SSE-S3 encrypted  |  |   - Lambda proxy integration     |
|   - OAC access only   |  |                                  |
|                       |  +---------------+------------------+
+-----------------------+                  |
                                           v
                           +---------------+------------------+
                           |                                  |
                           |   Lambda Function                |
                           |   - Hono REST API                |
                           |   - Node.js 20.x                 |
                           |   - 256MB / 30s                  |
                           |   - esbuild bundled              |
                           |                                  |
                           +---------------+------------------+
                                           |
                                           v
                           +---------------+------------------+
                           |                                  |
                           |   DynamoDB Table                  |
                           |   - On-Demand billing             |
                           |   - Encrypted at rest             |
                           |   - Point-in-Time Recovery        |
                           |                                  |
                           +----------------------------------+
```

## Request Flow

### Static Content (Frontend)
1. Client → CloudFront (HTTPS)
2. CloudFront → S3 (OAC signed request)
3. S3 → CloudFront → Client
4. SPA routing: 403/404 → `/index.html` fallback

### API Requests
1. Client → CloudFront `/api/*` (HTTPS)
2. CloudFront → API Gateway (no cache)
3. API Gateway → Lambda (proxy integration)
4. Lambda (Hono) → DynamoDB
5. Response flows back through the same chain

## CDK Stack Structure

```typescript
// Single stack: TodoStack
TodoStack
  |-- DynamoDB Table (TodoTable)
  |-- Lambda Function (NodejsFunction)
  |     |-- IAM Role (auto-generated, scoped to TodoTable)
  |     |-- Log Group (90-day retention)
  |-- HTTP API (API Gateway v2)
  |     |-- Lambda Integration
  |     |-- CORS Configuration
  |     |-- Access Log Group
  |-- S3 Bucket (Frontend)
  |     |-- Block Public Access
  |     |-- Auto-delete Objects (DESTROY)
  |-- CloudFront Distribution
  |     |-- S3 Origin (OAC)
  |     |-- API Gateway Origin
  |     |-- Response Headers Policy
  |     |-- Error Pages (SPA fallback)
  |-- CfnOutput: CloudFront URL, API URL
```

## Environment Configuration

| Variable | Source | Target |
|---|---|---|
| `TABLE_NAME` | CDK Stack → Lambda Env | Backend Runtime |
| `NODE_OPTIONS` | CDK Stack → Lambda Env | Backend Runtime |
| CloudFront URL | CDK Output | Deploy reference |
| API Gateway URL | CDK Output | Deploy reference |

## Deployment Steps

1. `pnpm install` — 依存関係インストール
2. `cd packages/infrastructure && npx cdk deploy` — CDK デプロイ
   - CDK が自動で backend を esbuild でバンドル
   - Frontend ビルド成果物を S3 にアップロード
3. CloudFront URL でアクセス確認
