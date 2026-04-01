import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Todo } from "../types/todo";
import { TodoList } from "./TodoList";

const mockTodos: Todo[] = [
	{
		id: "1",
		title: "Todo 1",
		completed: false,
		createdAt: "2026-01-01T00:00:00Z",
		updatedAt: "2026-01-01T00:00:00Z",
	},
	{
		id: "2",
		title: "Todo 2",
		completed: true,
		createdAt: "2026-01-01T00:00:00Z",
		updatedAt: "2026-01-01T00:00:00Z",
	},
];

describe("TodoList", () => {
	it("renders empty state when no todos", () => {
		render(
			<TodoList todos={[]} onToggle={vi.fn()} onUpdate={vi.fn()} onDelete={vi.fn()} />,
		);
		expect(screen.getByTestId("todo-list-empty")).toBeInTheDocument();
		expect(screen.getByText("TODO がありません")).toBeInTheDocument();
	});

	it("renders todo items", () => {
		render(
			<TodoList
				todos={mockTodos}
				onToggle={vi.fn()}
				onUpdate={vi.fn()}
				onDelete={vi.fn()}
			/>,
		);
		expect(screen.getByTestId("todo-list")).toBeInTheDocument();
		expect(screen.getByText("Todo 1")).toBeInTheDocument();
		expect(screen.getByText("Todo 2")).toBeInTheDocument();
	});

	it("renders correct number of items", () => {
		render(
			<TodoList
				todos={mockTodos}
				onToggle={vi.fn()}
				onUpdate={vi.fn()}
				onDelete={vi.fn()}
			/>,
		);
		expect(screen.getByTestId("todo-item-1")).toBeInTheDocument();
		expect(screen.getByTestId("todo-item-2")).toBeInTheDocument();
	});
});
