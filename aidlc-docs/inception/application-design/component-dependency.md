# Component Dependencies

## Dependency Matrix

| Component | Depends On | Depended By |
|---|---|---|
| **TodoApp** | TodoAPI, TodoList, TodoForm | - |
| **TodoList** | TodoItem | TodoApp |
| **TodoItem** | - | TodoList |
| **TodoForm** | - | TodoApp |
| **TodoAPI** | Backend API (HTTP) | TodoApp |
| **TodoRouter** | TodoHandler | Hono App |
| **TodoHandler** | TodoRepository | TodoRouter |
| **TodoRepository** | DynamoDB Client | TodoHandler |
| **TodoStack** | - | CDK App |

## Communication Patterns

### Frontend → Backend
- **Protocol**: HTTP/HTTPS (REST)
- **Format**: JSON
- **Base URL**: `${API_GATEWAY_URL}/api`
- **Error Handling**: HTTP ステータスコードベース

### Backend → Database
- **Protocol**: AWS SDK (HTTPS)
- **Format**: DynamoDB Document (JSON-like)
- **Connection**: Lambda 実行環境内の SDK クライアント

### Infrastructure → All
- **CDK Stack** が全 AWS リソースを定義
- Lambda 関数に環境変数でテーブル名を注入
- API Gateway と Lambda の統合設定
- CloudFront → S3 のオリジン設定

## Data Flow

```
+----------+    HTTP/JSON     +-----------+    AWS SDK     +----------+
|          | ---------------> |           | ------------> |          |
| Frontend |                  |  Backend  |               | DynamoDB |
|  (React) | <--------------- |  (Hono)   | <------------ |          |
|          |    HTTP/JSON     |           |    Document   |          |
+----------+                  +-----------+               +----------+
     |                              |
     |  S3 + CloudFront             |  Lambda
     |  (Static Hosting)            |  (Serverless Compute)
     v                              v
+------------------------------------------------+
|            AWS CDK (Infrastructure)            |
+------------------------------------------------+
```

## Package Dependencies (npm)

### packages/frontend
- `react`, `react-dom`
- `tailwindcss`
- `vite`
- `typescript`

### packages/backend
- `hono`
- `@hono/node-server` (ローカル開発用)
- `@aws-sdk/client-dynamodb`
- `@aws-sdk/lib-dynamodb`
- `ulid` (ID 生成)
- `typescript`

### packages/infrastructure
- `aws-cdk-lib`
- `constructs`
- `typescript`
