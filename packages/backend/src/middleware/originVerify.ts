import { createMiddleware } from "hono/factory";

// BR-013（RF-16 / QT-4）で確定したヘッダ名（infrastructure-specification.md が正 — CloudFront
// customHeaders / ローカル注入 3 箇所（docker-compose / Vite proxy / Playwright）と共有する契約値）
export const ORIGIN_VERIFY_HEADER = "x-origin-verify";

/**
 * オリジン検証ミドルウェア（BR-013 / RF-16 / QT-4 / D-1）。
 *
 * 意図経路の証明 — CloudFront が `/api/*` オリジンへ付与する `x-origin-verify` ヘッダと
 * 環境変数 `ORIGIN_VERIFY_SECRET` の一致を全リクエスト（API-001〜006）で検証する。
 * 不一致・欠落は 403（エラー JSON は `error` キーのみ — 内部情報なし）。
 *
 * 検証は常時有効（フェイルオープン経路なし — D-1）: 期待値（環境変数）が未設定の場合も
 * 全リクエストを 403 で拒否する（フェイルクローズ）。本番の期待値は Secrets Manager の
 * 動的参照で注入され（CH-7）、ローカルは dev 専用値 `local-dev-only` を
 * docker-compose / Vite proxy / Playwright が注入する（C-5 — 本番値と完全独立）。
 * 誤 403 化の回帰は E2E BT-7（/api/health 200）が検知する（RF-02）。
 */
export const originVerify = createMiddleware(async (c, next) => {
	const expected = process.env.ORIGIN_VERIFY_SECRET;
	const provided = c.req.header(ORIGIN_VERIFY_HEADER);
	if (!expected || provided !== expected) {
		return c.json({ error: "Forbidden" }, 403);
	}
	await next();
});
