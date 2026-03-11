# Integration Test Instructions

## Purpose

Frontend ↔ Backend ↔ DynamoDB 間の統合テストを実施し、エンドツーエンドの CRUD フローを検証。

## Integration Test Scenarios

### Scenario 1: Frontend → Backend API Integration（ローカル開発）

**Setup**:
```bash
# 1. DynamoDB Local を起動（Docker 使用）
docker run -d -p 8000:8000 amazon/dynamodb-local

# 2. DynamoDB テーブルを作成
aws dynamodb create-table \
  --endpoint-url http://localhost:8000 \
  --table-name TodoTable \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

# 3. Backend を起動
cd packages/backend
TABLE_NAME=TodoTable AWS_REGION=ap-northeast-1 \
  AWS_ACCESS_KEY_ID=local AWS_SECRET_ACCESS_KEY=local \
  DYNAMODB_ENDPOINT=http://localhost:8000 \
  pnpm dev

# 4. Frontend を起動（別ターミナル）
cd packages/frontend
pnpm dev
```

**Test Steps**:
1. ブラウザで `http://localhost:3000` を開く
2. TODO を作成（title: "テスト TODO"）→ 一覧に表示されることを確認
3. TODO の完了トグル → 取り消し線スタイルの適用を確認
4. TODO のタイトルを編集 → 更新が反映されることを確認
5. TODO を削除 → 一覧から消えることを確認

**Expected Results**:
- 全 CRUD 操作が正常に動作
- エラーが発生しない
- UI が即座に反映される

**Cleanup**:
```bash
docker stop $(docker ps -q --filter ancestor=amazon/dynamodb-local)
```

### Scenario 2: CDK Deploy → Live Integration（AWS 環境）

**Prerequisites**:
- AWS CLI が設定済み
- CDK bootstrap 済み

**Setup**:
```bash
# 1. Frontend をビルド
pnpm --filter @todo-ai-dlc/frontend build

# 2. CDK デプロイ
cd packages/infrastructure
npx cdk deploy --require-approval never
```

**Test Steps**:
1. CDK Output の CloudFront URL にアクセス
2. TODO CRUD 操作を実行（Scenario 1 と同じ）
3. API Gateway URL で直接 API テスト:
   ```bash
   # 一覧取得
   curl https://{cloudfront-url}/api/todos

   # 作成
   curl -X POST https://{cloudfront-url}/api/todos \
     -H "Content-Type: application/json" \
     -d '{"title":"Integration Test"}'

   # 更新
   curl -X PUT https://{cloudfront-url}/api/todos/{id} \
     -H "Content-Type: application/json" \
     -d '{"completed":true}'

   # 削除
   curl -X DELETE https://{cloudfront-url}/api/todos/{id}
   ```

**Expected Results**:
- CloudFront URL で SPA が正常に表示される
- API 経由の CRUD 操作がすべて成功する
- DynamoDB にデータが正しく保存される
- HTTPS リダイレクトが機能する

**Cleanup**:
```bash
cd packages/infrastructure
npx cdk destroy
```

## Notes

- DynamoDB Local を使用する場合、Backend の `todoRepository.ts` に `DYNAMODB_ENDPOINT` 環境変数対応が必要（将来の改善点）
- 現状はローカル開発での手動統合テストを推奨
