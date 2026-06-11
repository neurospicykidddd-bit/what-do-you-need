import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// during `vite dev`, proxy /api to a local serverless handler.
// in production on vercel, /api is served by the function in /api automatically.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
