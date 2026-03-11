# Component Methods

## Frontend - TodoAPI

| Method | Signature | Purpose |
|---|---|---|
| `fetchTodos` | `() => Promise<Todo[]>` | TODO 一覧取得 |
| `fetchTodo` | `(id: string) => Promise<Todo>` | TODO 個別取得 |
| `createTodo` | `(input: CreateTodoInput) => Promise<Todo>` | TODO 作成 |
| `updateTodo` | `(id: string, input: UpdateTodoInput) => Promise<Todo>` | TODO 更新 |
| `deleteTodo` | `(id: string) => Promise<void>` | TODO 削除 |

## Frontend - TodoApp (Hooks/Handlers)

| Method | Signature | Purpose |
|---|---|---|
| `handleCreate` | `(input: CreateTodoInput) => Promise<void>` | TODO 作成 → state 更新 |
| `handleUpdate` | `(id: string, input: UpdateTodoInput) => Promise<void>` | TODO 更新 → state 更新 |
| `handleDelete` | `(id: string) => Promise<void>` | TODO 削除 → state 更新 |
| `handleToggle` | `(id: string) => Promise<void>` | 完了状態トグル → state 更新 |

## Backend - TodoHandler

| Method | Signature | Purpose |
|---|---|---|
| `list` | `(c: Context) => Promise<Response>` | GET /api/todos |
| `get` | `(c: Context) => Promise<Response>` | GET /api/todos/:id |
| `create` | `(c: Context) => Promise<Response>` | POST /api/todos |
| `update` | `(c: Context) => Promise<Response>` | PUT /api/todos/:id |
| `remove` | `(c: Context) => Promise<Response>` | DELETE /api/todos/:id |

## Backend - TodoRepository

| Method | Signature | Purpose |
|---|---|---|
| `findAll` | `() => Promise<Todo[]>` | DynamoDB Scan で全件取得 |
| `findById` | `(id: string) => Promise<Todo \| null>` | DynamoDB GetItem で単一取得 |
| `create` | `(todo: Todo) => Promise<Todo>` | DynamoDB PutItem で作成 |
| `update` | `(id: string, input: UpdateTodoInput) => Promise<Todo>` | DynamoDB UpdateItem で更新 |
| `delete` | `(id: string) => Promise<void>` | DynamoDB DeleteItem で削除 |

## Shared Types

```typescript
interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreateTodoInput {
  title: string;
  description?: string;
}

interface UpdateTodoInput {
  title?: string;
  description?: string;
  completed?: boolean;
}
```
