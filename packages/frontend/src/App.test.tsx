import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./api/todoApi", () => ({
	todoApi: {
		fetchTodos: vi.fn().mockResolvedValue([]),
		createTodo: vi.fn(),
		updateTodo: vi.fn(),
		deleteTodo: vi.fn(),
	},
}));

const { default: App } = await import("./App");

describe("App", () => {
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
});
