import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSend = vi.fn();

vi.mock("@aws-sdk/client-dynamodb", () => ({
	DynamoDBClient: vi.fn(() => ({})),
}));

vi.mock("@aws-sdk/lib-dynamodb", () => ({
	DynamoDBDocumentClient: {
		from: vi.fn(() => ({ send: mockSend })),
	},
	ScanCommand: vi.fn((input: unknown) => ({ _type: "Scan", input })),
	GetCommand: vi.fn((input: unknown) => ({ _type: "Get", input })),
	PutCommand: vi.fn((input: unknown) => ({ _type: "Put", input })),
	UpdateCommand: vi.fn((input: unknown) => ({ _type: "Update", input })),
	DeleteCommand: vi.fn((input: unknown) => ({ _type: "Delete", input })),
}));

const { todoRepository } = await import("./todoRepository");

describe("todoRepository", () => {
	beforeEach(() => {
		mockSend.mockReset();
	});

	describe("findAll", () => {
		it("should return all todos", async () => {
			const items = [{ id: "1", title: "Test", completed: false, createdAt: "", updatedAt: "" }];
			mockSend.mockResolvedValueOnce({ Items: items });

			const result = await todoRepository.findAll();
			expect(result).toEqual(items);
		});

		it("should return empty array when no items", async () => {
			mockSend.mockResolvedValueOnce({ Items: undefined });

			const result = await todoRepository.findAll();
			expect(result).toEqual([]);
		});
	});

	describe("findById", () => {
		it("should return a todo by id", async () => {
			const item = { id: "1", title: "Test", completed: false, createdAt: "", updatedAt: "" };
			mockSend.mockResolvedValueOnce({ Item: item });

			const result = await todoRepository.findById("1");
			expect(result).toEqual(item);
		});

		it("should return null when not found", async () => {
			mockSend.mockResolvedValueOnce({ Item: undefined });

			const result = await todoRepository.findById("nonexistent");
			expect(result).toBeNull();
		});
	});

	describe("create", () => {
		it("should create and return a todo", async () => {
			const todo = {
				id: "1",
				title: "New Todo",
				completed: false,
				createdAt: "2026-01-01T00:00:00.000Z",
				updatedAt: "2026-01-01T00:00:00.000Z",
			};
			mockSend.mockResolvedValueOnce({});

			const result = await todoRepository.create(todo);
			expect(result).toEqual(todo);
			expect(mockSend).toHaveBeenCalledOnce();
		});
	});

	describe("update", () => {
		it("should update and return the updated todo", async () => {
			const updated = {
				id: "1",
				title: "Updated",
				completed: true,
				createdAt: "2026-01-01T00:00:00.000Z",
				updatedAt: "2026-01-02T00:00:00.000Z",
			};
			mockSend.mockResolvedValueOnce({ Attributes: updated });

			const result = await todoRepository.update("1", { title: "Updated", completed: true });
			expect(result).toEqual(updated);
		});
	});

	describe("delete", () => {
		it("should delete a todo", async () => {
			mockSend.mockResolvedValueOnce({});

			await todoRepository.delete("1");
			expect(mockSend).toHaveBeenCalledOnce();
		});
	});
});
