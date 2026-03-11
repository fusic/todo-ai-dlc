import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { handle } from "hono/aws-lambda";
import { todosRoute } from "./routes/todos";

const app = new Hono();

// Middleware (SECURITY-03: structured logging)
app.use("*", cors());
app.use("*", logger());

// Global error handler (SECURITY-15: fail-safe defaults, SECURITY-09: no stack traces)
app.onError((err, c) => {
	console.error("Unhandled error:", err.message);
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
