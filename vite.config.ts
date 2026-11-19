import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// By default the panel is served by the API at /panel (same origin). For a standalone deploy
// (e.g. Vercel) build with VITE_BASE=/ and VITE_API_URL=https://your-api.
// In development Vite forwards API calls to the local API.
const API = process.env.VITE_DEV_API || "http://localhost:4000";
const BASE = process.env.VITE_BASE || "/panel/";
const apiPaths = ["/auth", "/admin", "/events", "/tickets", "/health"];

export default defineConfig({
  base: BASE.endsWith("/") ? BASE : `${BASE}/`,
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5175,
    proxy: Object.fromEntries(apiPaths.map((p) => [p, { target: API, changeOrigin: true }])),
  },
});
