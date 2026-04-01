import { useEffect, useState } from "react";
import { todoApi } from "./api/todoApi";
import { TodoForm } from "./components/TodoForm";
import { TodoList } from "./components/TodoList";
import type { CreateTodoInput, Todo, UpdateTodoInput } from "./types/todo";

export default function App() {
	const [todos, setTodos] = useState<Todo[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

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

	async function handleCreate(input: CreateTodoInput) {
		const created = await todoApi.createTodo(input);
		setTodos((prev) => [created, ...prev]);
	}

	async function handleToggle(id: string) {
		const todo = todos.find((t) => t.id === id);
		if (!todo) return;
		const updated = await todoApi.updateTodo(id, { completed: !todo.completed });
		setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
	}

	async function handleUpdate(id: string, input: UpdateTodoInput) {
		const updated = await todoApi.updateTodo(id, input);
		setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
	}

	async function handleDelete(id: string) {
		await todoApi.deleteTodo(id);
		setTodos((prev) => prev.filter((t) => t.id !== id));
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
