import { useState, type FormEvent } from "react";
import type { CreateTodoInput } from "../types/todo";

interface TodoFormProps {
	onSubmit: (input: CreateTodoInput) => Promise<void>;
}

export function TodoForm({ onSubmit }: TodoFormProps) {
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		if (!title.trim()) return;

		setIsSubmitting(true);
		try {
			await onSubmit({
				title: title.trim(),
				description: description.trim() || undefined,
			});
			setTitle("");
			setDescription("");
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<form onSubmit={handleSubmit} data-testid="todo-form" className="space-y-3">
			<div>
				<input
					type="text"
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					placeholder="TODO タイトル"
					data-testid="todo-form-title-input"
					maxLength={200}
					className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
				/>
			</div>
			<div>
				<textarea
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					placeholder="説明（任意）"
					data-testid="todo-form-description-input"
					maxLength={1000}
					rows={2}
					className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
				/>
			</div>
			<button
				type="submit"
				disabled={!title.trim() || isSubmitting}
				data-testid="todo-form-submit-button"
				className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{isSubmitting ? "追加中..." : "追加"}
			</button>
		</form>
	);
}
