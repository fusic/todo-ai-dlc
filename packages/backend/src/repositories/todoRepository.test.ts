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

		// BR-007（RF-07 / QT-9）: 存在判定と書込は ConditionExpression による単一操作
		it("should send a single conditional write with attribute_exists(id)", async () => {
			mockSend.mockResolvedValueOnce({ Attributes: { id: "1" } });

			await todoRepository.update("1", { title: "Updated" });

			expect(mockSend).toHaveBeenCalledOnce();
			const command = mockSend.mock.calls[0][0] as {
				_type: string;
				input: { ConditionExpression?: string };
			};
			expect(command._type).toBe("Update");
			expect(command.input.ConditionExpression).toBe("attribute_exists(id)");
		});

		it("should return null when conditional check fails (id not found)", async () => {
			const error = new Error("The conditional request failed");
			error.name = "ConditionalCheckFailedException";
			mockSend.mockRejectedValueOnce(error);

			const result = await todoRepository.update("nonexistent", { title: "Updated" });
			expect(result).toBeNull();
			expect(mockSend).toHaveBeenCalledOnce();
		});

		// BR-012: 条件失敗以外の例外は 500 系として伝播する
		it("should rethrow non-conditional errors", async () => {
			mockSend.mockRejectedValueOnce(new Error("ServiceUnavailable"));

			await expect(todoRepository.update("1", { title: "Updated" })).rejects.toThrow(
				"ServiceUnavailable",
			);
		});
	});

	describe("delete", () => {
		it("should delete a todo and return true", async () => {
			mockSend.mockResolvedValueOnce({});

			const result = await todoRepository.delete("1");
			expect(result).toBe(true);
			expect(mockSend).toHaveBeenCalledOnce();
		});

		// BR-007（RF-07 / QT-9）: 存在判定と削除は ConditionExpression による単一操作
		it("should send a single conditional delete with attribute_exists(id)", async () => {
			mockSend.mockResolvedValueOnce({});

			await todoRepository.delete("1");

			expect(mockSend).toHaveBeenCalledOnce();
			const command = mockSend.mock.calls[0][0] as {
				_type: string;
				input: { ConditionExpression?: string };
			};
			expect(command._type).toBe("Delete");
			expect(command.input.ConditionExpression).toBe("attribute_exists(id)");
		});

		it("should return false when conditional check fails (id not found)", async () => {
			const error = new Error("The conditional request failed");
			error.name = "ConditionalCheckFailedException";
			mockSend.mockRejectedValueOnce(error);

			const result = await todoRepository.delete("nonexistent");
			expect(result).toBe(false);
			expect(mockSend).toHaveBeenCalledOnce();
		});

		// BR-012: 条件失敗以外の例外は 500 系として伝播する
		it("should rethrow non-conditional errors", async () => {
			mockSend.mockRejectedValueOnce(new Error("ServiceUnavailable"));

			await expect(todoRepository.delete("1")).rejects.toThrow("ServiceUnavailable");
		});
	});
});
