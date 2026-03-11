# Unit of Work Dependencies

## Dependency Matrix

| Unit | Depends On | Depended By | Dependency Type |
|---|---|---|---|
| **backend** | - | frontend (runtime), infrastructure (deploy) | None |
| **frontend** | backend (runtime API) | infrastructure (deploy) | Runtime |
| **infrastructure** | backend (build artifact), frontend (build artifact) | - | Build-time |

## Dependency Details

### backend → (none)
- 独立して開発・テスト可能
- DynamoDB テーブルはローカルでも DynamoDB Local で代替可能

### frontend → backend
- **Type**: Runtime dependency
- **Interface**: HTTP REST API (JSON)
- **Coupling**: Loose（API エンドポイント URL のみ）
- **Development**: backend API が未完成でもモック可能
- **Configuration**: `VITE_API_URL` 環境変数で API ベース URL を設定

### infrastructure → backend, frontend
- **Type**: Build-time dependency
- **Interface**: ビルド成果物（Lambda ZIP, S3 静的ファイル）
- **Coupling**: Medium（ビルドパスの参照）
- **Development**: CDK synth はビルド成果物なしでもスタブで可能

## Build Order

```
1. backend   (independent)
2. frontend  (can develop in parallel with mock API)
3. infrastructure (requires build artifacts from both)
```

## Integration Points

| From | To | Protocol | Data Format | Notes |
|---|---|---|---|---|
| frontend | backend | HTTP/HTTPS | JSON | API Gateway 経由 |
| infrastructure | backend | File System | ZIP archive | Lambda デプロイパッケージ |
| infrastructure | frontend | File System | Static files | S3 アップロード |
| backend | DynamoDB | AWS SDK | Document | IAM ロールによる認証 |
