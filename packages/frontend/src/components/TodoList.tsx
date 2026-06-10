import type { Todo, UpdateTodoInput } from "@todo-ai-dlc/shared";
import { TodoItem } from "./TodoItem";

interface TodoListProps {
	todos: Todo[];
	onToggle: (id: string) => Promise<void>;
	onUpdate: (id: string, input: UpdateTodoInput) => Promise<void>;
	onDelete: (id: string) => Promise<void>;
}

export function TodoList({ todos, onToggle, onUpdate, onDelete }: TodoListProps) {
	if (todos.length === 0) {
		return (
			<div data-testid="todo-list-empty" className="py-12 text-center text-gray-500">
				<p className="text-lg">TODO がありません</p>
				<p className="text-sm">上のフォームから新しい TODO を追加してください</p>
			</div>
		);
	}

	return (
		<div data-testid="todo-list" className="space-y-3">
			{todos.map((todo) => (
				<TodoItem
					key={todo.id}
					todo={todo}
					onToggle={onToggle}
					onUpdate={onUpdate}
					onDelete={onDelete}
				/>
			))}
		</div>
	);
}
