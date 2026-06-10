// CMP-003 の unit テスト — schema 境界値（BR-001 / BR-002 / BR-006）
// 境界値リテラル（200 / 1000 等）は共有定数から導出せず直書きする
// （共有定数の誤変更を検知する独立検証点 — functional-design Q3=a）。
import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { CreateTodoSchema, UpdateTodoSchema } from "./schemas";
import type { CreateTodoInput, UpdateTodoInput } from "./types";

// --- 型レベルアサーション: schema の導出型と公開型の整合（BR-014 — ドリフトは typecheck で fail）---
type AssertEqual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const _createAligned: AssertEqual<z.infer<typeof CreateTodoSchema>, CreateTodoInput> = true;
const _updateAligned: AssertEqual<z.infer<typeof UpdateTodoSchema>, UpdateTodoInput> = true;
void _createAligned;
void _updateAligned;

describe("CreateTodoSchema (BR-001 / BR-002)", () => {
	it("accepts title of 1 character (lower boundary)", () => {
		expect(CreateTodoSchema.safeParse({ title: "a" }).success).toBe(true);
	});

	it("accepts title of exactly 200 characters (upper boundary)", () => {
		expect(CreateTodoSchema.safeParse({ title: "a".repeat(200) }).success).toBe(true);
	});

	it("rejects empty title", () => {
		expect(CreateTodoSchema.safeParse({ title: "" }).success).toBe(false);
	});

	it("rejects missing title", () => {
		expect(CreateTodoSchema.safeParse({}).success).toBe(false);
	});

	it("rejects title of 201 characters", () => {
		expect(CreateTodoSchema.safeParse({ title: "a".repeat(201) }).success).toBe(false);
	});

	it("accepts description of exactly 1000 characters (upper boundary)", () => {
		const result = CreateTodoSchema.safeParse({ title: "t", description: "d".repeat(1000) });
		expect(result.success).toBe(true);
	});

	it("rejects description of 1001 characters", () => {
		const result = CreateTodoSchema.safeParse({ title: "t", description: "d".repeat(1001) });
		expect(result.success).toBe(false);
	});

	it("accepts missing description (optional)", () => {
		expect(CreateTodoSchema.safeParse({ title: "t" }).success).toBe(true);
	});
});

describe("UpdateTodoSchema (BR-001 / BR-002 / BR-006)", () => {
	it("accepts empty object (partial update semantics — BR-006)", () => {
		expect(UpdateTodoSchema.safeParse({}).success).toBe(true);
	});

	it("accepts title of exactly 200 characters (upper boundary)", () => {
		expect(UpdateTodoSchema.safeParse({ title: "a".repeat(200) }).success).toBe(true);
	});

	it("rejects empty title when present", () => {
		expect(UpdateTodoSchema.safeParse({ title: "" }).success).toBe(false);
	});

	it("rejects title of 201 characters", () => {
		expect(UpdateTodoSchema.safeParse({ title: "a".repeat(201) }).success).toBe(false);
	});

	it("accepts description of exactly 1000 characters (upper boundary)", () => {
		expect(UpdateTodoSchema.safeParse({ description: "d".repeat(1000) }).success).toBe(true);
	});

	it("rejects description of 1001 characters", () => {
		expect(UpdateTodoSchema.safeParse({ description: "d".repeat(1001) }).success).toBe(false);
	});

	it("accepts completed boolean toggle", () => {
		expect(UpdateTodoSchema.safeParse({ completed: true }).success).toBe(true);
	});

	it("rejects non-boolean completed", () => {
		expect(UpdateTodoSchema.safeParse({ completed: "yes" }).success).toBe(false);
	});
});
