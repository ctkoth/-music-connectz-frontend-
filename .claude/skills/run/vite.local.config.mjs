// Local dev config for driving the app against a local API.
//
// Two things differ from vite.config.js and both are load-bearing:
//
//   * /api is PROXIED to Django, so the page is same-origin. Talking to :8000
//     cross-origin is allow-listed and still fails under a real page load —
//     the dev server drops connections and the reset surfaces as a CORS error,
//     which sends you debugging CORS instead of the connection. Same-origin
//     has no preflight to fail.
//   * port 5174, so this never collides with a plain `npm run dev` on 5173.
//
// Pair it with VITE_API_BASE=http://localhost:5174. Leaving that empty does
// NOT mean same-origin — api.js treats "" as unset and falls through to the
// production API.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The config lives three levels down, so root has to be said explicitly —
// vite would otherwise treat this directory as the project.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

export default defineConfig({
  root: repoRoot,
  plugins: [react()],
  server: {
    port: 5174,
    proxy: { "/api": { target: "http://127.0.0.1:8000", changeOrigin: true } },
  },
});
