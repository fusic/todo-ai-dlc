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
			},
		},
	},
	build: {
		outDir: "dist",
	},
});
