# Services

## Service Overview

基本 CRUD の TODO アプリのため、サービスレイヤーはシンプルな構成です。

| Service | Layer | Purpose |
|---|---|---|
| **Hono App** | Backend | REST API のオーケストレーション |
| **DynamoDB Client** | Backend | AWS SDK v3 DynamoDB クライアント |

## Hono App Service

- **Role**: HTTP リクエストのルーティングとミドルウェアチェーンの管理
- **Middleware Stack**:
  1. `cors()` - CORS ヘッダーの付与
  2. `logger()` - リクエストログ出力
- **Route Registration**: TodoRouter のエンドポイントを `/api` プレフィックスで登録

## DynamoDB Client Service

- **Role**: DynamoDB テーブルとの接続管理
- **Implementation**: `@aws-sdk/client-dynamodb` + `@aws-sdk/lib-dynamodb` (DocumentClient)
- **Configuration**:
  - テーブル名は環境変数 `TABLE_NAME` から取得
  - リージョンは環境変数 `AWS_REGION` から取得（デフォルト: ap-northeast-1）

## Service Interaction Flow

```
[Client Browser]
      |
      v
[CloudFront] --> [S3] (static assets)
      |
      v
[API Gateway] (/api/*)
      |
      v
[Lambda Function]
      |
      v
[Hono App]
  |-- cors middleware
  |-- logger middleware
  |-- TodoRouter
        |-- TodoHandler
              |-- TodoRepository
                    |-- DynamoDB DocumentClient
                          |-- DynamoDB Table
```
