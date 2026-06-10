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
	});

	describe("PUT /api/todos/:id", () => {
		it("should update a todo", async () => {
			const existing = { id: "1", title: "Old", completed: false };
			const updated = { id: "1", title: "Updated", completed: false };
			mockRepository.findById.mockResolvedValueOnce(existing);
			mockRepository.update.mockResolvedValueOnce(updated);

			const res = await app.request("/api/todos/1", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ title: "Updated" }),
			});

			expect(res.status).toBe(200);
			expect(await res.json()).toEqual(updated);
		});

		it("should return 404 when updating non-existent todo", async () => {
			mockRepository.findById.mockResolvedValueOnce(null);

			const res = await app.request("/api/todos/nonexistent", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ title: "Updated" }),
			});

			expect(res.status).toBe(404);
		});

		it("should return 400 for invalid update data", async () => {
			const existing = { id: "1", title: "Old", completed: false };
			mockRepository.findById.mockResolvedValueOnce(existing);

			const res = await app.request("/api/todos/1", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ completed: "not-a-boolean" }),
			});

			expect(res.status).toBe(400);
		});
	});

	describe("DELETE /api/todos/:id", () => {
		it("should delete a todo", async () => {
			const existing = { id: "1", title: "Test", completed: false };
			mockRepository.findById.mockResolvedValueOnce(existing);
			mockRepository.delete.mockResolvedValueOnce(undefined);

			const res = await app.request("/api/todos/1", { method: "DELETE" });
			expect(res.status).toBe(204);
		});

		it("should return 404 when deleting non-existent todo", async () => {
			mockRepository.findById.mockResolvedValueOnce(null);

			const res = await app.request("/api/todos/nonexistent", { method: "DELETE" });
			expect(res.status).toBe(404);
		});
	});
});
