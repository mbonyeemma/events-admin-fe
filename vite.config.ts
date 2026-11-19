import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Default: a standalone site at "/" that calls the production API (see src/lib/api.ts).
// `npm run build:api` builds the copy an API serves at /panel on its own origin.
// With VITE_API_URL empty, the dev server forwards API calls to a local API (VITE_DEV_API).
const API = process.env.VITE_DEV_API || "http://localhost:4000";
const BASE = process.env.VITE_BASE || "/";
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
