import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ORIGIN_VERIFY_HEADER, originVerify } from "./originVerify";

// BR-013（RF-16 / QT-4 / D-1）: 一致 / 不一致 / 欠落 + フェイルクローズ（期待値未設定）
describe("originVerify middleware (BR-013 / RF-16 / QT-4)", () => {
	function createApp() {
		const app = new Hono();
		app.use("*", originVerify);
		app.get("/api/health", (c) => c.json({ status: "ok" }));
		return app;
	}

	beforeEach(() => {
		vi.stubEnv("ORIGIN_VERIFY_SECRET", "test-secret-value");
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("should pass the request through when the header matches ORIGIN_VERIFY_SECRET", async () => {
		const res = await createApp().request("/api/health", {
			headers: { [ORIGIN_VERIFY_HEADER]: "test-secret-value" },
		});
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ status: "ok" });
	});

	it("should reject with 403 when the header does not match", async () => {
		const res = await createApp().request("/api/health", {
			headers: { [ORIGIN_VERIFY_HEADER]: "wrong-value" },
		});
		expect(res.status).toBe(403);
		// 共通エラー応答（api-specification.md）: error キーのみ・内部情報なし
		expect(await res.json()).toEqual({ error: "Forbidden" });
	});

	it("should reject with 403 when the header is missing", async () => {
		const res = await createApp().request("/api/health");
		expect(res.status).toBe(403);
		expect(await res.json()).toEqual({ error: "Forbidden" });
	});

	it("should fail closed (403) when ORIGIN_VERIFY_SECRET is not configured (D-1: フェイルオープン経路なし)", async () => {
		vi.stubEnv("ORIGIN_VERIFY_SECRET", "");
		const res = await createApp().request("/api/health", {
			headers: { [ORIGIN_VERIFY_HEADER]: "" },
		});
		expect(res.status).toBe(403);
		expect(await res.json()).toEqual({ error: "Forbidden" });
	});
});
