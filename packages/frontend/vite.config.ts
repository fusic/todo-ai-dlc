import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react(), tailwindcss()],
	server: {
		port: 3000,
		host: true,
		watch: {
			usePolling: !!process.env.VITE_USE_POLLING,
		},
		proxy: {
			"/api": {
				target: process.env.VITE_PROXY_TARGET ?? "http://localhost:3001",
				changeOrigin: true,
				// オリジン検証（BR-013 / RF-16）の dev 専用値を注入 — 本番で CloudFront が担う
				// ヘッダ付与をローカルでは Vite proxy が担い、検証ミドルウェアは常時有効のまま
				// 本番と同一コードパスを通す（D-1 / C-5 — 本番値とは完全独立の自明な値）
				headers: { "x-origin-verify": "local-dev-only" },
			},
		},
	},
	build: {
		outDir: "dist",
	},
});
