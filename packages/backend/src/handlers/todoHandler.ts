import type { Todo } from "@todo-ai-dlc/shared";
import { CreateTodoSchema, UpdateTodoSchema } from "@todo-ai-dlc/shared/schemas";
import type { Context, Env } from "hono";
import { ulid } from "ulid";
import { todoRepository } from "../repositories/todoRepository";

// BR-008（RF-04）: JSON として解釈不能なボディはサーバーエラー（500）ではなく 400。
// 評価順序は「ボディ解釈 → 入力検証 → 書込」に固定する（BR-009 — 400 が 404 に優先）。
type JsonBody = { parsed: true; body: unknown } | { parsed: false };

async function readJsonBody(c: Context): Promise<JsonBody> {
	try {
		return { parsed: true, body: await c.req.json() };
	} catch {
		return { parsed: false };
	}
}

// BR-010（RF-06）: 一覧の順序保証はコントラクトの一部。永続化層の走査順は不定のため、
// 応答生成時に CMP-002 が必ずソートする（createdAt 降順・tie は id 降順 — ULID は辞書順 = 時系列）。
function sortForList(todos: Todo[]): Todo[] {
	return [...todos].sort((a, b) => {
		if (a.createdAt !== b.createdAt) {
			return a.createdAt < b.createdAt ? 1 : -1;
		}
		return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
	});
}

export const todoHandler = {
	async list(c: Context) {
		const todos = await todoRepository.findAll();
		return c.json(sortForList(todos));
	},

	async get(c: Context<Env, "/:id">) {
		const id = c.req.param("id");
		const todo = await todoRepository.findById(id);
		if (!todo) {
			return c.json({ error: "Todo not found" }, 404);
		}
		return c.json(todo);
	},

	async create(c: Context) {
		const body = await readJsonBody(c);
		if (!body.parsed) {
			return c.json({ error: "Invalid JSON body" }, 400);
		}
		const parsed = CreateTodoSchema.safeParse(body.body);
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

	async update(c: Context<Env, "/:id">) {
		const id = c.req.param("id");
		const body = await readJsonBody(c);
		if (!body.parsed) {
			return c.json({ error: "Invalid JSON body" }, 400);
		}
		const parsed = UpdateTodoSchema.safeParse(body.body);
		if (!parsed.success) {
			return c.json(
				{ error: "Validation failed", details: parsed.error.flatten().fieldErrors },
				400,
			);
		}

		// BR-007（RF-07）: 存在判定と書込はアトミックな条件付き書込 1 回（upsert 経路なし — QT-9）
		const updated = await todoRepository.update(id, parsed.data);
		if (!updated) {
			return c.json({ error: "Todo not found" }, 404);
		}
		return c.json(updated);
	},

	async remove(c: Context<Env, "/:id">) {
		const id = c.req.param("id");
		// BR-007（RF-07）: 存在判定と削除はアトミックな条件付き書込 1 回（QT-9）
		const deleted = await todoRepository.delete(id);
		if (!deleted) {
			return c.json({ error: "Todo not found" }, 404);
		}
		return c.body(null, 204);
	},
};
