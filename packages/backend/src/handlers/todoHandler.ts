import type { Context } from "hono";
import { ulid } from "ulid";
import { todoRepository } from "../repositories/todoRepository";
import { CreateTodoSchema, UpdateTodoSchema } from "../types/todo";
import type { Todo } from "../types/todo";

export const todoHandler = {
	async list(c: Context) {
		const todos = await todoRepository.findAll();
		return c.json(todos);
	},

	async get(c: Context) {
		const id = c.req.param("id");
		const todo = await todoRepository.findById(id);
		if (!todo) {
			return c.json({ error: "Todo not found" }, 404);
		}
		return c.json(todo);
	},

	async create(c: Context) {
		const body = await c.req.json();
		const parsed = CreateTodoSchema.safeParse(body);
		if (!parsed.success) {
			return c.json(
				{ error: "Validation failed", details: parsed.error.flatten().fieldErrors },
				400,
			);
		}

		const now = new Date().toISOString();
		const todo: Todo = {
			id: ulid(),
			title: parsed.data.title,
			description: parsed.data.description,
			completed: false,
			createdAt: now,
			updatedAt: now,
		};

		const created = await todoRepository.create(todo);
		return c.json(created, 201);
	},

	async update(c: Context) {
		const id = c.req.param("id");
		const existing = await todoRepository.findById(id);
		if (!existing) {
			return c.json({ error: "Todo not found" }, 404);
		}

		const body = await c.req.json();
		const parsed = UpdateTodoSchema.safeParse(body);
		if (!parsed.success) {
			return c.json(
				{ error: "Validation failed", details: parsed.error.flatten().fieldErrors },
				400,
			);
		}

		const updated = await todoRepository.update(id, parsed.data);
		return c.json(updated);
	},

	async remove(c: Context) {
		const id = c.req.param("id");
		const existing = await todoRepository.findById(id);
		if (!existing) {
			return c.json({ error: "Todo not found" }, 404);
		}

		await todoRepository.delete(id);
		return c.body(null, 204);
	},
};
