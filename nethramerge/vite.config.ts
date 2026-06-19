import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const localApiTarget = process.env.VITE_LOCAL_API_TARGET || process.env.LOCAL_API_TARGET || "http://localhost:8082";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    strictPort: true,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api/ai-chat": {
        target: "http://195.35.22.13:3001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ai-chat/, "/api/chat"),
      },
      "/api/vehicles": {
        target: localApiTarget,
        changeOrigin: true,
      },
      "/api/drivers": {
        target: localApiTarget,
        changeOrigin: true,
      },
      "/api/employees": {
        target: localApiTarget,
        changeOrigin: true,
      },
      "/api/user-permissions": {
        target: localApiTarget,
        changeOrigin: true,
      },
      "/api": {
        target: localApiTarget,
        changeOrigin: true,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
}));
