import {
	DESCRIPTION_MAX_LENGTH,
	TITLE_MAX_LENGTH,
	type Todo,
	type UpdateTodoInput,
} from "@todo-ai-dlc/shared";
import { useState } from "react";

interface TodoItemProps {
	todo: Todo;
	onToggle: (id: string) => Promise<void>;
	onUpdate: (id: string, input: UpdateTodoInput) => Promise<void>;
	onDelete: (id: string) => Promise<void>;
}

// RF-08（WF-002）: createdAt の人間可読表示。タイムゾーンに依存しない決定的なテストのため
// Intl.DateTimeFormat を単一の整形点として公開する
export const createdAtFormatter = new Intl.DateTimeFormat("ja-JP", {
	dateStyle: "medium",
	timeStyle: "short",
});

export function TodoItem({ todo, onToggle, onUpdate, onDelete }: TodoItemProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [editTitle, setEditTitle] = useState(todo.title);
	const [editDescription, setEditDescription] = useState(todo.description ?? "");

	async function handleSave() {
		if (!editTitle.trim()) return;
		try {
			await onUpdate(todo.id, {
				title: editTitle.trim(),
				description: editDescription.trim() || undefined,
			});
			setIsEditing(false);
		} catch {
			// BR-011（RF-05）: 失敗は親（App）がユーザー可視のエラーとして表示する。
			// 編集モードを維持して再保存できるようにする
		}
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
					maxLength={TITLE_MAX_LENGTH}
					className="mb-2 w-full rounded border border-gray-300 px-3 py-1"
				/>
				<textarea
					value={editDescription}
					onChange={(e) => setEditDescription(e.target.value)}
					data-testid={`todo-item-${todo.id}-edit-description`}
					maxLength={DESCRIPTION_MAX_LENGTH}
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
				<p className={`text-lg ${todo.completed ? "text-gray-400 line-through" : "text-gray-900"}`}>
					{todo.title}
				</p>
				{todo.description && <p className="mt-1 text-sm text-gray-500">{todo.description}</p>}
				<p data-testid={`todo-item-${todo.id}-created-at`} className="mt-1 text-xs text-gray-400">
					作成: {createdAtFormatter.format(new Date(todo.createdAt))}
				</p>
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
