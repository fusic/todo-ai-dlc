import { useState } from "react";
import type { Todo, UpdateTodoInput } from "../types/todo";

interface TodoItemProps {
	todo: Todo;
	onToggle: (id: string) => Promise<void>;
	onUpdate: (id: string, input: UpdateTodoInput) => Promise<void>;
	onDelete: (id: string) => Promise<void>;
}

export function TodoItem({ todo, onToggle, onUpdate, onDelete }: TodoItemProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [editTitle, setEditTitle] = useState(todo.title);
	const [editDescription, setEditDescription] = useState(todo.description ?? "");

	async function handleSave() {
		if (!editTitle.trim()) return;
		await onUpdate(todo.id, {
			title: editTitle.trim(),
			description: editDescription.trim() || undefined,
		});
		setIsEditing(false);
	}

	function handleCancel() {
		setEditTitle(todo.title);
		setEditDescription(todo.description ?? "");
		setIsEditing(false);
	}

	if (isEditing) {
		return (
			<div
				data-testid={`todo-item-${todo.id}`}
				className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
			>
				<input
					type="text"
					value={editTitle}
					onChange={(e) => setEditTitle(e.target.value)}
					data-testid={`todo-item-${todo.id}-edit-title`}
					maxLength={200}
					className="mb-2 w-full rounded border border-gray-300 px-3 py-1"
				/>
				<textarea
					value={editDescription}
					onChange={(e) => setEditDescription(e.target.value)}
					data-testid={`todo-item-${todo.id}-edit-description`}
					maxLength={1000}
					rows={2}
					className="mb-2 w-full rounded border border-gray-300 px-3 py-1"
				/>
				<div className="flex gap-2">
					<button
						type="button"
						onClick={handleSave}
						data-testid={`todo-item-${todo.id}-save-button`}
						className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
					>
						保存
					</button>
					<button
						type="button"
						onClick={handleCancel}
						data-testid={`todo-item-${todo.id}-cancel-button`}
						className="rounded bg-gray-400 px-3 py-1 text-sm text-white hover:bg-gray-500"
					>
						キャンセル
					</button>
				</div>
			</div>
		);
	}

	return (
		<div
			data-testid={`todo-item-${todo.id}`}
			className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
		>
			<input
				type="checkbox"
				checked={todo.completed}
				onChange={() => onToggle(todo.id)}
				data-testid={`todo-item-${todo.id}-toggle`}
				className="h-5 w-5 rounded border-gray-300"
			/>
			<div className="flex-1">
				<p
					className={`text-lg ${todo.completed ? "text-gray-400 line-through" : "text-gray-900"}`}
				>
					{todo.title}
				</p>
				{todo.description && <p className="mt-1 text-sm text-gray-500">{todo.description}</p>}
			</div>
			<div className="flex gap-2">
				<button
					type="button"
					onClick={() => setIsEditing(true)}
					data-testid={`todo-item-${todo.id}-edit-button`}
					className="rounded bg-yellow-500 px-3 py-1 text-sm text-white hover:bg-yellow-600"
				>
					編集
				</button>
				<button
					type="button"
					onClick={() => onDelete(todo.id)}
					data-testid={`todo-item-${todo.id}-delete-button`}
					className="rounded bg-red-500 px-3 py-1 text-sm text-white hover:bg-red-600"
				>
					削除
				</button>
			</div>
		</div>
	);
}
