import { randomUUID } from "node:crypto";
import { Logger } from "@aws-lambda-powertools/logger";
import { Hono } from "hono";
import { handle } from "hono/aws-lambda";
import { todosRoute } from "./routes/todos";

// QT-6（RF-10 / D-6）: 構造化ログ — AWS Lambda Powertools Logger（JSON パース可能率 100%）
const logger = new Logger({ serviceName: "todo-backend" });

type AppEnv = {
	Variables: {
		requestId: string;
	};
};

// requestId: Lambda 実行時は awsRequestId、ローカル実行時は UUID を採番（D-6 必須フィールド）
function resolveRequestId(env: unknown): string {
	const lambdaContext = (env as { lambdaContext?: { awsRequestId?: string } } | undefined)
		?.lambdaContext;
	return lambdaContext?.awsRequestId ?? randomUUID();
}

const app = new Hono<AppEnv>();

// CORS は定義しない（RF-12 / functional Q2=a — 0 箇所）:
// 既知クライアントは同梱 SPA のみで、本番 = CDN 経由・ローカル = Vite プロキシ経由の同一オリジン `/api`。

// アクセスログ（RF-10）: method / path / status / requestId を JSON で出力（QT-6）
app.use("*", async (c, next) => {
	c.set("requestId", resolveRequestId(c.env));
	await next();
	logger.info("request completed", {
		method: c.req.method,
		path: c.req.path,
		status: c.res.status,
		requestId: c.get("requestId"),
	});
});

// Global error handler（BR-012 / RF-11）: クライアントには固定の汎用 500 ボディのみ。
// stack を含むエラー詳細はサーバー側の構造化ログにのみ記録する（調査可能性と非開示の両立）。
app.onError((err, c) => {
	logger.error("unhandled error", {
		method: c.req.method,
		path: c.req.path,
		status: 500,
		requestId: c.get("requestId"),
		error: err,
	});
	return c.json({ error: "Internal server error" }, 500);
});

// Routes
app.route("/api/todos", todosRoute);

// Health check
app.get("/api/health", (c) => c.json({ status: "ok" }));

// Lambda handler export
export const handler = handle(app);

// Default export for local development
export default app;
