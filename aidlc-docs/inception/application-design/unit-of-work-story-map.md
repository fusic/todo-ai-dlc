# Unit of Work - Story Map

## Note
User Stories ステージはスキップされたため、機能要件（FR）をストーリーの代わりにマッピングします。

## Functional Requirements to Unit Mapping

| Requirement | backend | frontend | infrastructure |
|---|---|---|---|
| **FR-001**: TODO 作成 | POST /api/todos + Repository.create | TodoForm + TodoApp.handleCreate | Lambda + API Gateway + DynamoDB |
| **FR-002**: TODO 一覧表示 | GET /api/todos + Repository.findAll | TodoList + TodoApp (useEffect) | Lambda + API Gateway + DynamoDB |
| **FR-003**: TODO 更新 | PUT /api/todos/:id + Repository.update | TodoItem (edit/toggle) + TodoApp.handleUpdate | Lambda + API Gateway + DynamoDB |
| **FR-004**: TODO 削除 | DELETE /api/todos/:id + Repository.delete | TodoItem (delete) + TodoApp.handleDelete | Lambda + API Gateway + DynamoDB |

## Unit Coverage Summary

| Unit | Requirements Covered | Coverage |
|---|---|---|
| **backend** | FR-001, FR-002, FR-003, FR-004 | 100% |
| **frontend** | FR-001, FR-002, FR-003, FR-004 | 100% |
| **infrastructure** | FR-001, FR-002, FR-003, FR-004 (hosting) | 100% |

## Cross-Unit Interactions per Requirement

### FR-001: TODO 作成
1. User fills TodoForm → submits
2. TodoApp calls TodoAPI.createTodo()
3. Frontend sends POST /api/todos to API Gateway
4. API Gateway routes to Lambda
5. Hono TodoHandler validates & calls TodoRepository.create()
6. DynamoDB PutItem stores the TODO
7. Response flows back to Frontend, state updates

### FR-002: TODO 一覧表示
1. TodoApp useEffect calls TodoAPI.fetchTodos() on mount
2. Frontend sends GET /api/todos to API Gateway
3. Lambda TodoHandler calls TodoRepository.findAll()
4. DynamoDB Scan returns all items
5. Response rendered by TodoList → TodoItem components

### FR-003: TODO 更新
1. User clicks edit/toggle on TodoItem
2. TodoApp calls TodoAPI.updateTodo()
3. Frontend sends PUT /api/todos/:id
4. Lambda TodoHandler validates & calls TodoRepository.update()
5. DynamoDB UpdateItem modifies the item
6. State refreshed in Frontend

### FR-004: TODO 削除
1. User clicks delete on TodoItem
2. TodoApp calls TodoAPI.deleteTodo()
3. Frontend sends DELETE /api/todos/:id
4. Lambda TodoHandler calls TodoRepository.delete()
5. DynamoDB DeleteItem removes the item
6. State refreshed in Frontend
