import { defineConfig } from "astro/config";
import preact from "@astrojs/preact";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  integrations: [preact()],
  vite: {
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("/node_modules/three/")) return "three-vendor";
          },
        },
      },
    },
  },
  devToolbar: { enabled: false },
  server: {
    host: "0.0.0.0",
    port: 5173,
    // OrbStack asigna dominios locales como `frontend.oilguard.orb.local`.
    // El punto inicial permite el dominio y todos sus subdominios.
    allowedHosts: [".orb.local", ".orb", ".local", "localhost"],
  },
  preview: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: [".orb.local", ".orb", ".local", "localhost"],
  },
});
