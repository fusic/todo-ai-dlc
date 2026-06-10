import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Todo } from "@todo-ai-dlc/shared";
import { describe, expect, it, vi } from "vitest";
import { createdAtFormatter, TodoItem } from "./TodoItem";

const mockTodo: Todo = {
	id: "test-1",
	title: "Test Todo",
	description: "Test description",
	completed: false,
	createdAt: "2026-01-01T00:00:00Z",
	updatedAt: "2026-01-01T00:00:00Z",
};

const completedTodo: Todo = {
	...mockTodo,
	id: "test-2",
	completed: true,
};

describe("TodoItem", () => {
	it("renders todo details", () => {
		render(<TodoItem todo={mockTodo} onToggle={vi.fn()} onUpdate={vi.fn()} onDelete={vi.fn()} />);
		expect(screen.getByText("Test Todo")).toBeInTheDocument();
		expect(screen.getByText("Test description")).toBeInTheDocument();
	});

	it("shows completed styling when todo is completed", () => {
		render(
			<TodoItem todo={completedTodo} onToggle={vi.fn()} onUpdate={vi.fn()} onDelete={vi.fn()} />,
		);
		const checkbox = screen.getByTestId("todo-item-test-2-toggle") as HTMLInputElement;
		expect(checkbox.checked).toBe(true);
	});

	it("calls onToggle when checkbox clicked", () => {
		const onToggle = vi.fn().mockResolvedValueOnce(undefined);
		render(<TodoItem todo={mockTodo} onToggle={onToggle} onUpdate={vi.fn()} onDelete={vi.fn()} />);
		fireEvent.click(screen.getByTestId("todo-item-test-1-toggle"));
		expect(onToggle).toHaveBeenCalledWith("test-1");
	});

	it("calls onDelete when delete button clicked", () => {
		const onDelete = vi.fn().mockResolvedValueOnce(undefined);
		render(<TodoItem todo={mockTodo} onToggle={vi.fn()} onUpdate={vi.fn()} onDelete={onDelete} />);
		fireEvent.click(screen.getByTestId("todo-item-test-1-delete-button"));
		expect(onDelete).toHaveBeenCalledWith("test-1");
	});

	it("enters edit mode when edit button clicked", () => {
		render(<TodoItem todo={mockTodo} onToggle={vi.fn()} onUpdate={vi.fn()} onDelete={vi.fn()} />);
		fireEvent.click(screen.getByTestId("todo-item-test-1-edit-button"));
		expect(screen.getByTestId("todo-item-test-1-edit-title")).toBeInTheDocument();
		expect(screen.getByTestId("todo-item-test-1-save-button")).toBeInTheDocument();
		expect(screen.getByTestId("todo-item-test-1-cancel-button")).toBeInTheDocument();
	});

	it("cancels edit mode", () => {
		render(<TodoItem todo={mockTodo} onToggle={vi.fn()} onUpdate={vi.fn()} onDelete={vi.fn()} />);
		fireEvent.click(screen.getByTestId("todo-item-test-1-edit-button"));
		fireEvent.click(screen.getByTestId("todo-item-test-1-cancel-button"));
		expect(screen.getByTestId("todo-item-test-1-edit-button")).toBeInTheDocument();
	});

	// RF-08（WF-002）: createdAt の人間可読表示
	it("renders human-readable createdAt", () => {
		render(<TodoItem todo={mockTodo} onToggle={vi.fn()} onUpdate={vi.fn()} onDelete={vi.fn()} />);
		const expected = createdAtFormatter.format(new Date(mockTodo.createdAt));
		expect(screen.getByTestId("todo-item-test-1-created-at")).toHaveTextContent(expected);
	});

	// BR-011（RF-05）: 保存失敗時は編集モードを維持し、再保存できる
	it("stays in edit mode when onUpdate rejects", async () => {
		const onUpdate = vi.fn().mockRejectedValueOnce(new Error("Internal server error"));
		render(<TodoItem todo={mockTodo} onToggle={vi.fn()} onUpdate={onUpdate} onDelete={vi.fn()} />);

		fireEvent.click(screen.getByTestId("todo-item-test-1-edit-button"));
		fireEvent.change(screen.getByTestId("todo-item-test-1-edit-title"), {
			target: { value: "Edited" },
		});
		fireEvent.click(screen.getByTestId("todo-item-test-1-save-button"));

		await waitFor(() => expect(onUpdate).toHaveBeenCalledOnce());
		expect(screen.getByTestId("todo-item-test-1-edit-title")).toBeInTheDocument();
		expect(screen.getByTestId("todo-item-test-1-edit-title")).toHaveValue("Edited");
	});
});
