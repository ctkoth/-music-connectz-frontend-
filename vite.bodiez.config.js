// BodieZ as its own installable app. Run from the repo root:
//   npm run dev:bodiez     npm run build:bodiez   (→ dist-bodiez/)
// See standalone/bodiez/README.md for hosting.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve("standalone/bodiez");
const overlay = path.join(root, "public");

// BodieZ.jsx loads its icons from /icons/…, which live in the main site's
// public/. So the main public/ is served, and standalone/bodiez/public/ lays
// over it (manifest, app icons, logo). Dev serves the overlay first; build
// copies it on top via tools/finish-bodiez.mjs.
const overlayInDev = () => ({
  name: "bodiez-overlay",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const f = path.join(overlay, decodeURIComponent((req.url || "/").split("?")[0]));
      if (f.startsWith(overlay) && fs.existsSync(f) && fs.statSync(f).isFile()) {
        res.setHeader("Content-Type", mime(f));
        return fs.createReadStream(f).pipe(res);
      }
      next();
    });
  },
});
const mime = (f) => ({ ".png": "image/png", ".webmanifest": "application/manifest+json" }[path.extname(f)] || "application/octet-stream");

export default defineConfig({
  root,
  publicDir: path.resolve("public"),
  envDir: path.resolve("."),
  plugins: [react(), overlayInDev()],
  // Tells the shared auth screens they are not on the main site: no OAuth
  // buttons (its redirect URIs are registered for musicconnectz.net only) and
  // no "download the Music ConnectZ app" box.
  define: { "import.meta.env.VITE_STANDALONE": JSON.stringify("bodiez") },
  // MCZ_API=http://localhost:8000 serves /api same-origin in dev (pair it with
  // VITE_API_BASE=http://localhost:5175) — a cross-origin dev API drops
  // connections that surface as CORS errors.
  server: {
    port: 5175,
    fs: { allow: [path.resolve(".")] },
    proxy: process.env.MCZ_API ? { "/api": process.env.MCZ_API } : undefined,
  },
  build: { outDir: path.resolve("dist-bodiez"), emptyOutDir: true },
});
