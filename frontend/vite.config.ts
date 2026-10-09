import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// S0 scaffolding config. Dev server bound for Docker port mapping.
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
  preview: {
    port: 5173,
  },
});
