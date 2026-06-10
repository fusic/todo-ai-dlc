import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Powertools Logger をテストでは global console 経由にする（POWERTOOLS_DEV — 公式のテスト手法）。
// Logger はモジュールロード時に環境変数を読むため、index の import より前に設定する。
vi.stubEnv("POWERTOOLS_DEV", "true");
// オリジン検証（BR-013 / RF-16）の dev 値 — ローカル経路と同一の注入方式（C-5）
vi.stubEnv("ORIGIN_VERIFY_SECRET", "local-dev-only");

// 全リクエストに付与する意図経路の証明ヘッダ（検証ミドルウェアは常時有効 — D-1）
const devOriginHeaders = { "x-origin-verify": "local-dev-only" };

const mockRepository = {
	findAll: vi.fn(),
	findById: vi.fn(),
	create: vi.fn(),
	update: vi.fn(),
	delete: vi.fn(),
};

vi.mock("./repositories/todoRepository", () => ({
	todoRepository: mockRepository,
}));

const { default: app } = await import("./index");

describe("structured logging (RF-10/11 — QT-6 / D-6)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should emit JSON-parseable access log with method/path/status/requestId", async () => {
		const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

		const res = await app.request("/api/health", { headers: devOriginHeaders });
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ status: "ok" });

		expect(infoSpy).toHaveBeenCalled();
		const raw = infoSpy.mock.calls.at(-1)?.[0] as string;
		// QT-6: JSON パース可能率 100% + 必須フィールド
		const log = JSON.parse(raw);
		expect(log.method).toBe("GET");
		expect(log.path).toBe("/api/health");
		expect(log.status).toBe(200);
		expect(typeof log.requestId).toBe("string");
		expect(log.requestId.length).toBeGreaterThan(0);
	});

	// RF-12（functional Q2=a）: CORS 応答ヘッダは 0 箇所（同一オリジン前提 — BP-1 許容変更 5）
	it("should not emit CORS response headers", async () => {
		vi.spyOn(console, "info").mockImplementation(() => {});

		const res = await app.request("/api/health", {
			headers: { Origin: "https://example.com", ...devOriginHeaders },
		});
		expect(res.status).toBe(200);
		expect(res.headers.get("access-control-allow-origin")).toBeNull();
	});

	// BR-013（RF-16 / QT-4）: 全 API の前段で意図経路を検証する（配線の統合確認 — 詳細は middleware テスト）
	it("should reject requests without the origin verification header with 403", async () => {
		const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

		const res = await app.request("/api/health");
		expect(res.status).toBe(403);
		expect(await res.json()).toEqual({ error: "Forbidden" });

		// 403 拒否もアクセスログに記録される（直接アクセス試行の観測性）
		const raw = infoSpy.mock.calls.at(-1)?.[0] as string;
		expect(JSON.parse(raw).status).toBe(403);
	});

	it("should log status for non-2xx handler responses", async () => {
		const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
		mockRepository.findById.mockResolvedValueOnce(null);

		const res = await app.request("/api/todos/nonexistent", { headers: devOriginHeaders });
		expect(res.status).toBe(404);

		const raw = infoSpy.mock.calls.at(-1)?.[0] as string;
		const log = JSON.parse(raw);
		expect(log.status).toBe(404);
		expect(log.path).toBe("/api/todos/nonexistent");
	});

	it("should log stack server-side and keep 500 body generic on unhandled error", async () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		mockRepository.findAll.mockRejectedValueOnce(new Error("boom"));

		const res = await app.request("/api/todos", { headers: devOriginHeaders });
		expect(res.status).toBe(500);
		// BR-012: クライアントには内部情報を開示しない（固定の汎用ボディ）
		expect(await res.json()).toEqual({ error: "Internal server error" });

		expect(errorSpy).toHaveBeenCalled();
		const raw = errorSpy.mock.calls.at(-1)?.[0] as string;
		const log = JSON.parse(raw);
		expect(log.method).toBe("GET");
		expect(log.path).toBe("/api/todos");
		expect(log.status).toBe(500);
		expect(typeof log.requestId).toBe("string");
		// RF-11（D-6）: エラー時はサーバー側ログに stack を記録する
		// （POWERTOOLS_DEV モードでは stack が行配列に整形されるため両形式を許容）
		const stack = Array.isArray(log.error?.stack)
			? log.error.stack.join("\n")
			: (log.error?.stack ?? "");
		expect(stack).toContain("boom");
	});
});
