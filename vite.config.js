import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { versionInfo, versionPlugin } from "./vite.version.mjs";

const VERSION = versionInfo();

export default defineConfig({
  plugins: [react(), versionPlugin(VERSION)],
  // Module workers: the mastering worker loads its MP3 encoder on first use.
  worker: { format: "es" },
  define: { __MCZ_VERSION__: JSON.stringify(VERSION) },
  server: { port: 5173 },
});
