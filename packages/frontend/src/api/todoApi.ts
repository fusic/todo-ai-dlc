import type { CreateTodoInput, Todo, UpdateTodoInput } from "@todo-ai-dlc/shared";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

async function handleResponse<T>(response: Response): Promise<T> {
	if (!response.ok) {
		const error = await response.json().catch(() => ({ error: "Request failed" }));
		throw new Error(error.error ?? `HTTP ${response.status}`);
	}
	if (response.status === 204) {
		return undefined as T;
	}
	return response.json();
}

export const todoApi = {
	async fetchTodos(): Promise<Todo[]> {
		const res = await fetch(`${API_BASE}/todos`);
		return handleResponse<Todo[]>(res);
	},

	async fetchTodo(id: string): Promise<Todo> {
		const res = await fetch(`${API_BASE}/todos/${id}`);
		return handleResponse<Todo>(res);
	},

	async createTodo(input: CreateTodoInput): Promise<Todo> {
		const res = await fetch(`${API_BASE}/todos`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(input),
		});
		return handleResponse<Todo>(res);
	},

	async updateTodo(id: string, input: UpdateTodoInput): Promise<Todo> {
		const res = await fetch(`${API_BASE}/todos/${id}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(input),
		});
		return handleResponse<Todo>(res);
	},

	async deleteTodo(id: string): Promise<void> {
		const res = await fetch(`${API_BASE}/todos/${id}`, {
			method: "DELETE",
		});
		return handleResponse<void>(res);
	},
};
