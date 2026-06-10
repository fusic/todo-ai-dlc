import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRepository = {
	findAll: vi.fn(),
	findById: vi.fn(),
	create: vi.fn(),
	update: vi.fn(),
	delete: vi.fn(),
};

vi.mock("../repositories/todoRepository", () => ({
	todoRepository: mockRepository,
}));

vi.mock("ulid", () => ({
	ulid: vi.fn(() => "01TESTULID000000000000000"),
}));

const { todoHandler } = await import("./todoHandler");

function createApp() {
	const app = new Hono();
	app.get("/api/todos", todoHandler.list);
	app.get("/api/todos/:id", todoHandler.get);
	app.post("/api/todos", todoHandler.create);
	app.put("/api/todos/:id", todoHandler.update);
	app.delete("/api/todos/:id", todoHandler.remove);
	return app;
}

describe("todoHandler", () => {
	let app: ReturnType<typeof createApp>;

	beforeEach(() => {
		app = createApp();
		vi.clearAllMocks();
	});

	describe("GET /api/todos", () => {
		it("should return all todos", async () => {
			const todos = [{ id: "1", title: "Test", completed: false }];
			mockRepository.findAll.mockResolvedValueOnce(todos);

			const res = await app.request("/api/todos");
			expect(res.status).toBe(200);
			expect(await res.json()).toEqual(todos);
		});

		it("should return empty array", async () => {
			mockRepository.findAll.mockResolvedValueOnce([]);

			const res = await app.request("/api/todos");
			expect(res.status).toBe(200);
			expect(await res.json()).toEqual([]);
		});

		// BR-010（RF-06）: createdAt 降順 — 永続化層の走査順に依存しない
		it("should return todos sorted by createdAt descending", async () => {
			const oldest = { id: "01A", title: "oldest", createdAt: "2026-01-01T00:00:00.000Z" };
			const newest = { id: "01C", title: "newest", createdAt: "2026-03-01T00:00:00.000Z" };
			const middle = { id: "01B", title: "middle", createdAt: "2026-02-01T00:00:00.000Z" };
			mockRepository.findAll.mockResolvedValueOnce([oldest, newest, middle]);

			const res = await app.request("/api/todos");
			expect(res.status).toBe(200);
			const body = await res.json();
			expect(body.map((t: { id: string }) => t.id)).toEqual(["01C", "01B", "01A"]);
		});

		// BR-010: 同一 createdAt（ミリ秒一致）の tie は id 降順で決定的
		it("should break createdAt ties by id descending (deterministic order)", async () => {
			const sameTime = "2026-01-15T00:00:00.000Z";
			const a = { id: "01AAA", title: "a", createdAt: sameTime };
			const b = { id: "01BBB", title: "b", createdAt: sameTime };
			const c = { id: "01CCC", title: "c", createdAt: sameTime };
			mockRepository.findAll.mockResolvedValueOnce([a, c, b]);

			const res = await app.request("/api/todos");
			const body = await res.json();
			expect(body.map((t: { id: string }) => t.id)).toEqual(["01CCC", "01BBB", "01AAA"]);

			// 走査順が変わっても同一結果（決定性）
			mockRepository.findAll.mockResolvedValueOnce([b, a, c]);
			const res2 = await app.request("/api/todos");
			const body2 = await res2.json();
			expect(body2.map((t: { id: string }) => t.id)).toEqual(["01CCC", "01BBB", "01AAA"]);
		});
	});

	describe("GET /api/todos/:id", () => {
		it("should return a todo", async () => {
			const todo = { id: "1", title: "Test", completed: false };
			mockRepository.findById.mockResolvedValueOnce(todo);

			const res = await app.request("/api/todos/1");
			expect(res.status).toBe(200);
			expect(await res.json()).toEqual(todo);
		});

		it("should return 404 when not found", async () => {
			mockRepository.findById.mockResolvedValueOnce(null);

			const res = await app.request("/api/todos/nonexistent");
			expect(res.status).toBe(404);
		});
	});

	describe("POST /api/todos", () => {
		it("should create a todo", async () => {
			mockRepository.create.mockImplementationOnce((todo: unknown) => Promise.resolve(todo));

			const res = await app.request("/api/todos", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ title: "New Todo" }),
			});

			expect(res.status).toBe(201);
			const body = await res.json();
			expect(body.title).toBe("New Todo");
			expect(body.completed).toBe(false);
			expect(body.id).toBe("01TESTULID000000000000000");
		});

		it("should create a todo with description", async () => {
			mockRepository.create.mockImplementationOnce((todo: unknown) => Promise.resolve(todo));

			const res = await app.request("/api/todos", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ title: "New Todo", description: "Details" }),
			});

			expect(res.status).toBe(201);
			const body = await res.json();
			expect(body.description).toBe("Details");
		});

		it("should return 400 for empty title", async () => {
			const res = await app.request("/api/todos", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ title: "" }),
			});

			expect(res.status).toBe(400);
			const body = await res.json();
			expect(body.error).toBe("Validation failed");
		});

		it("should return 400 for missing title", async () => {
			const res = await app.request("/api/todos", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({}),
			});

			expect(res.status).toBe(400);
		});

		it("should return 400 for title exceeding 200 chars", async () => {
			const res = await app.request("/api/todos", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ title: "a".repeat(201) }),
			});

			expect(res.status).toBe(400);
		});

		// BR-008（RF-04）: JSON 解釈不能は 500 ではなく 400
		it("should return 400 when body is not valid JSON", async () => {
			const res = await app.request("/api/todos", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: "{not json",
			});

			expect(res.status).toBe(400);
			const body = await res.json();
			expect(body.error).toBeDefined();
			expect(mockRepository.create).not.toHaveBeenCalled();
		});
	});

	describe("PUT /api/todos/:id", () => {
		it("should update a todo", async () => {
			const updated = { id: "1", title: "Updated", completed: false };
			mockRepository.update.mockResolvedValueOnce(updated);

			const res = await app.request("/api/todos/1", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ title: "Updated" }),
			});

			expect(res.status).toBe(200);
			expect(await res.json()).toEqual(updated);
			// BR-007（QT-9）: 事前の存在確認読取なし — 条件付き書込 1 回のみ
			expect(mockRepository.update).toHaveBeenCalledOnce();
			expect(mockRepository.findById).not.toHaveBeenCalled();
		});

		// BR-007（RF-07）: 条件付き書込の条件失敗 = 404。新規作成（upsert）にならない
		it("should return 404 when updating non-existent todo", async () => {
			mockRepository.update.mockResolvedValueOnce(null);

			const res = await app.request("/api/todos/nonexistent", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ title: "Updated" }),
			});

			expect(res.status).toBe(404);
			expect(await res.json()).toEqual({ error: "Todo not found" });
		});

		// BR-009: 不正ボディ × 存在しない id の複合ケースは 400 が 404 に優先（BP-1 許容変更 4）
		it("should return 400 (not 404) when body is invalid and id does not exist", async () => {
			const res = await app.request("/api/todos/nonexistent", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ completed: "not-a-boolean" }),
			});

			expect(res.status).toBe(400);
			expect(mockRepository.update).not.toHaveBeenCalled();
		});

		// BR-006: 空オブジェクトは有効入力（updatedAt のみ更新）
		it("should accept empty object body as valid partial update", async () => {
			const updated = { id: "1", title: "Old", completed: false };
			mockRepository.update.mockResolvedValueOnce(updated);

			const res = await app.request("/api/todos/1", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({}),
			});

			expect(res.status).toBe(200);
			expect(mockRepository.update).toHaveBeenCalledWith("1", {});
		});

		it("should return 400 for invalid update data", async () => {
			const res = await app.request("/api/todos/1", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ completed: "not-a-boolean" }),
			});

			expect(res.status).toBe(400);
			expect(mockRepository.update).not.toHaveBeenCalled();
		});

		// BR-008（RF-04）: JSON 解釈不能は 500 ではなく 400。書込にも進まない
		it("should return 400 when update body is not valid JSON", async () => {
			const res = await app.request("/api/todos/1", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: "{not json",
			});

			expect(res.status).toBe(400);
			const body = await res.json();
			expect(body.error).toBeDefined();
			expect(mockRepository.update).not.toHaveBeenCalled();
		});
	});

	describe("DELETE /api/todos/:id", () => {
		it("should delete a todo", async () => {
			mockRepository.delete.mockResolvedValueOnce(true);

			const res = await app.request("/api/todos/1", { method: "DELETE" });
			expect(res.status).toBe(204);
			// BR-007（QT-9）: 事前の存在確認読取なし — 条件付き削除 1 回のみ
			expect(mockRepository.delete).toHaveBeenCalledOnce();
			expect(mockRepository.findById).not.toHaveBeenCalled();
		});

		// BR-007（RF-07）: 条件付き削除の条件失敗 = 404
		it("should return 404 when deleting non-existent todo", async () => {
			mockRepository.delete.mockResolvedValueOnce(false);

			const res = await app.request("/api/todos/nonexistent", { method: "DELETE" });
			expect(res.status).toBe(404);
			expect(await res.json()).toEqual({ error: "Todo not found" });
		});
	});
});
