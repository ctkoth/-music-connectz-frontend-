// IntelligenceZ as its own installable app. Run from the repo root:
//   npm run dev:intelligencez     npm run build:intelligencez   (→ dist-intelligencez/)
// See standalone/intelligencez/README.md for hosting.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve("standalone/intelligencez");
const overlay = path.join(root, "public");

// The screens in this shell load their icons from /icons/…, which live in the
// main site's public/. So the main public/ is served, and
// standalone/intelligencez/public/ lays over it (manifest, app icons, logo,
// assetlinks). Dev serves the overlay first; build copies it on top via
// tools/finish-intelligencez.mjs.
const overlayInDev = () => ({
  name: "intelligencez-overlay",
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
const mime = (f) => ({
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
  ".json": "application/json",
}[path.extname(f)] || "application/octet-stream");

export default defineConfig({
  root,
  publicDir: path.resolve("public"),
  envDir: path.resolve("."),
  plugins: [react(), overlayInDev()],
  // Tells the shared screens they are not on the main site: no OAuth buttons
  // (its redirect URIs are registered for musicconnectz.net only), no "download
  // the Music ConnectZ app" box, no door to a screen this shell does not have,
  // and nothing that offers a purchase (src/standalone.js).
  define: { "import.meta.env.VITE_STANDALONE": JSON.stringify("intelligencez") },
  // MCZ_API=http://localhost:8000 serves /api same-origin in dev (pair it with
  // VITE_API_BASE=http://localhost:5177) — a cross-origin dev API drops
  // connections that surface as CORS errors.
  server: {
    port: 5177,
    fs: { allow: [path.resolve(".")] },
    proxy: process.env.MCZ_API ? { "/api": process.env.MCZ_API } : undefined,
  },
  build: { outDir: path.resolve("dist-intelligencez"), emptyOutDir: true },
});
