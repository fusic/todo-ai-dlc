// ローカル開発専用エントリ（Lambda バンドル対象外 — Lambda のエントリは index.ts）。
// オリジン検証（BR-013 / RF-16）の期待値はローカルでは dev 専用値（C-5 — 本番値と完全独立）。
// docker-compose は environment で注入する。ホスト直接起動時の既定値をここで補い、
// 検証ミドルウェアは常時有効のまま本番と同一コードパスを通す（D-1 — フェイルオープンではない）。
process.env.ORIGIN_VERIFY_SECRET ??= "local-dev-only";

const { serve } = await import("@hono/node-server");
const { default: app } = await import("./index");

// RF-21: port はハードコードせず PORT 環境変数（既定 3001 — 現行どおり）
const port = Number(process.env.PORT ?? 3001);
console.log(`Backend server running on http://localhost:${port}`);
serve({ fetch: app.fetch, port });

export {};
