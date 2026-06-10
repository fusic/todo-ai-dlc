import { fireEvent, render, screen } from "@testing-library/react";
import type { Todo } from "@todo-ai-dlc/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockTodoApi = {
	fetchTodos: vi.fn(),
	createTodo: vi.fn(),
	updateTodo: vi.fn(),
	deleteTodo: vi.fn(),
};

vi.mock("./api/todoApi", () => ({
	todoApi: mockTodoApi,
}));

const { default: App } = await import("./App");

const mockTodo: Todo = {
	id: "todo-1",
	title: "Existing Todo",
	completed: false,
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("App", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockTodoApi.fetchTodos.mockResolvedValue([]);
	});

	it("renders app title", () => {
		render(<App />);
		expect(screen.getByTestId("app-title")).toHaveTextContent("TODO App");
	});

	it("shows loading state initially", () => {
		render(<App />);
		expect(screen.getByTestId("app-loading")).toBeInTheDocument();
	});

	it("renders todo form", () => {
		render(<App />);
		expect(screen.getByTestId("todo-form")).toBeInTheDocument();
	});

	// BR-011（RF-05）: ミューテーション失敗はユーザー可視のエラーとして表示される
	describe("mutation failure visibility (BR-011)", () => {
		it("shows visible error and keeps input when create fails", async () => {
			mockTodoApi.createTodo.mockRejectedValueOnce(new Error("Internal server error"));
			render(<App />);

			fireEvent.change(screen.getByTestId("todo-form-title-input"), {
				target: { value: "Will fail" },
			});
			fireEvent.click(screen.getByTestId("todo-form-submit-button"));

			const banner = await screen.findByTestId("app-action-error");
			expect(banner).toHaveTextContent("TODO の作成に失敗しました");
			// 再送できるよう入力値は保持される
			expect(screen.getByTestId("todo-form-title-input")).toHaveValue("Will fail");
		});

		it("shows visible error and keeps item when delete fails", async () => {
			mockTodoApi.fetchTodos.mockResolvedValue([mockTodo]);
			mockTodoApi.deleteTodo.mockRejectedValueOnce(new Error("Internal server error"));
			render(<App />);

			fireEvent.click(await screen.findByTestId("todo-item-todo-1-delete-button"));

			const banner = await screen.findByTestId("app-action-error");
			expect(banner).toHaveTextContent("TODO の削除に失敗しました");
			// 削除されていないアイテムは一覧に残る
			expect(screen.getByTestId("todo-item-todo-1")).toBeInTheDocument();
		});

		it("shows visible error when toggle fails", async () => {
			mockTodoApi.fetchTodos.mockResolvedValue([mockTodo]);
			mockTodoApi.updateTodo.mockRejectedValueOnce(new Error("Internal server error"));
			render(<App />);

			fireEvent.click(await screen.findByTestId("todo-item-todo-1-toggle"));

			const banner = await screen.findByTestId("app-action-error");
			expect(banner).toHaveTextContent("TODO の更新に失敗しました");
		});

		it("clears action error via close button", async () => {
			mockTodoApi.fetchTodos.mockResolvedValue([mockTodo]);
			mockTodoApi.deleteTodo.mockRejectedValueOnce(new Error("Internal server error"));
			render(<App />);

			fireEvent.click(await screen.findByTestId("todo-item-todo-1-delete-button"));
			const banner = await screen.findByTestId("app-action-error");

			fireEvent.click(banner.querySelector("button") as HTMLButtonElement);
			expect(screen.queryByTestId("app-action-error")).not.toBeInTheDocument();
		});
	});
});
