import type { CreateTodoInput, Todo, UpdateTodoInput } from "@todo-ai-dlc/shared";
import { useEffect, useState } from "react";
import { todoApi } from "./api/todoApi";
import { TodoForm } from "./components/TodoForm";
import { TodoList } from "./components/TodoList";

export default function App() {
	const [todos, setTodos] = useState<Todo[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	// BR-011（RF-05）: ミューテーション失敗のユーザー可視エラー（読み込みエラーとは別系統で表示）
	const [actionError, setActionError] = useState<string | null>(null);

	useEffect(() => {
		loadTodos();
	}, []);

	async function loadTodos() {
		try {
			setLoading(true);
			setError(null);
			const data = await todoApi.fetchTodos();
			setTodos(data);
		} catch {
			setError("TODO の読み込みに失敗しました");
		} finally {
			setLoading(false);
		}
	}

	// 失敗を呼び出し元（フォーム / 編集 UI）にも伝える必要があるミューテーションは rethrow し、
	// 呼び出し元が UI 状態（入力値保持・編集モード維持）を制御する。未処理 rejection は発生させない（BR-011）。
	async function handleCreate(input: CreateTodoInput) {
		setActionError(null);
		try {
			const created = await todoApi.createTodo(input);
			setTodos((prev) => [created, ...prev]);
		} catch (e) {
			setActionError("TODO の作成に失敗しました");
			throw e;
		}
	}

	async function handleToggle(id: string) {
		const todo = todos.find((t) => t.id === id);
		if (!todo) return;
		setActionError(null);
		try {
			const updated = await todoApi.updateTodo(id, { completed: !todo.completed });
			setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
		} catch {
			setActionError("TODO の更新に失敗しました");
		}
	}

	async function handleUpdate(id: string, input: UpdateTodoInput) {
		setActionError(null);
		try {
			const updated = await todoApi.updateTodo(id, input);
			setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
		} catch (e) {
			setActionError("TODO の更新に失敗しました");
			throw e;
		}
	}

	async function handleDelete(id: string) {
		setActionError(null);
		try {
			await todoApi.deleteTodo(id);
			setTodos((prev) => prev.filter((t) => t.id !== id));
		} catch {
			setActionError("TODO の削除に失敗しました");
		}
	}

	return (
		<div className="mx-auto max-w-2xl px-4 py-8">
			<h1 data-testid="app-title" className="mb-8 text-3xl font-bold text-gray-900">
				TODO App
			</h1>

			<div className="mb-8">
				<TodoForm onSubmit={handleCreate} />
			</div>

			{error && (
				<div data-testid="app-error" className="mb-4 rounded-lg bg-red-50 p-4 text-red-700">
					{error}
					<button type="button" onClick={loadTodos} className="ml-2 underline">
						再読み込み
					</button>
				</div>
			)}

			{actionError && (
				<div
					data-testid="app-action-error"
					className="mb-4 rounded-lg bg-red-50 p-4 text-red-700"
					role="alert"
				>
					{actionError}
					<button type="button" onClick={() => setActionError(null)} className="ml-2 underline">
						閉じる
					</button>
				</div>
			)}

			{loading ? (
				<div data-testid="app-loading" className="py-12 text-center text-gray-500">
					読み込み中...
				</div>
			) : (
				<TodoList
					todos={todos}
					onToggle={handleToggle}
					onUpdate={handleUpdate}
					onDelete={handleDelete}
				/>
			)}
		</div>
	);
}
