import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Music ConnectZ — Vite config
// Dev server runs on :5173. Build outputs to /dist.
// VITE_API_BASE env var lets you point at the deployed Django backend or local.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, host: true },
  build: { outDir: 'dist', sourcemap: false, target: 'es2020' },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '0.7.0'),
  },
});
