// vite.config.js (root)
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "frontend",                 // 👈 sposta la root su /frontend
  plugins: [react()],
  server: {
    proxy: {
      "/api": { target: "http://localhost:4000", changeOrigin: true },
    },
  },
  build: {
    outDir: "dist",                 // output in /frontend/dist (relativo a root)
    emptyOutDir: true,
  },
});
