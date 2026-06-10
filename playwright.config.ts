// E2E スモーク（RF-02 / D-7）— docker compose 環境（A-7）の実ブラウザで実行する。
// 配置はルート直下 e2e/ + ルート devDependencies（code-generation Q1=a — workspace パッケージは 4 のまま）。
// 起動はテストの前提条件（CI ではセットアップステップを分離し、環境起動失敗とテスト失敗を区別する）:
//   docker compose up -d --build && pnpm test:e2e
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e",
	// 単一共有リスト（A-2）に対する直列シナリオのため並列実行しない
	fullyParallel: false,
	workers: 1,
	forbidOnly: !!process.env.CI,
	retries: 0,
	reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
	use: {
		baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
		// オリジン検証（BR-013 / RF-16）の dev 専用値を注入（D-1 / C-5）。
		// page 経由は Vite proxy も同値を付与するが、request fixture（BT-7）にも確実に載せる
		extraHTTPHeaders: { "x-origin-verify": "local-dev-only" },
		// 失敗時は Playwright トレースで調査する（nfr-design E2E スモークパターン）
		trace: "retain-on-failure",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
});
