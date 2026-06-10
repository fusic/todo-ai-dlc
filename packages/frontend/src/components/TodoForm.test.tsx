import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TodoForm } from "./TodoForm";

describe("TodoForm", () => {
	it("renders form elements", () => {
		render(<TodoForm onSubmit={vi.fn()} />);
		expect(screen.getByTestId("todo-form-title-input")).toBeInTheDocument();
		expect(screen.getByTestId("todo-form-description-input")).toBeInTheDocument();
		expect(screen.getByTestId("todo-form-submit-button")).toBeInTheDocument();
	});

	it("submit button is disabled when title is empty", () => {
		render(<TodoForm onSubmit={vi.fn()} />);
		expect(screen.getByTestId("todo-form-submit-button")).toBeDisabled();
	});

	it("enables submit button when title is entered", () => {
		render(<TodoForm onSubmit={vi.fn()} />);
		fireEvent.change(screen.getByTestId("todo-form-title-input"), {
			target: { value: "Test" },
		});
		expect(screen.getByTestId("todo-form-submit-button")).toBeEnabled();
	});

	it("calls onSubmit with input values", async () => {
		const onSubmit = vi.fn().mockResolvedValueOnce(undefined);
		render(<TodoForm onSubmit={onSubmit} />);

		fireEvent.change(screen.getByTestId("todo-form-title-input"), {
			target: { value: "Test Todo" },
		});
		fireEvent.change(screen.getByTestId("todo-form-description-input"), {
			target: { value: "Description" },
		});
		fireEvent.click(screen.getByTestId("todo-form-submit-button"));

		expect(onSubmit).toHaveBeenCalledWith({
			title: "Test Todo",
			description: "Description",
		});
	});

	it("clears form after successful submit", async () => {
		const onSubmit = vi.fn().mockResolvedValueOnce(undefined);
		render(<TodoForm onSubmit={onSubmit} />);

		fireEvent.change(screen.getByTestId("todo-form-title-input"), {
			target: { value: "Test" },
		});
		fireEvent.click(screen.getByTestId("todo-form-submit-button"));

		await vi.waitFor(() => {
			expect(screen.getByTestId("todo-form-title-input")).toHaveValue("");
		});
	});

	// BR-011（RF-05）: 失敗時は未処理 rejection を発生させず、再送できるよう入力値を保持する
	it("keeps input values and re-enables submit when onSubmit rejects", async () => {
		const onSubmit = vi.fn().mockRejectedValueOnce(new Error("Internal server error"));
		render(<TodoForm onSubmit={onSubmit} />);

		fireEvent.change(screen.getByTestId("todo-form-title-input"), {
			target: { value: "Will fail" },
		});
		fireEvent.click(screen.getByTestId("todo-form-submit-button"));

		await vi.waitFor(() => {
			expect(screen.getByTestId("todo-form-submit-button")).toBeEnabled();
		});
		expect(onSubmit).toHaveBeenCalledOnce();
		expect(screen.getByTestId("todo-form-title-input")).toHaveValue("Will fail");
	});
});
