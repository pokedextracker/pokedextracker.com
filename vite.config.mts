import { hostname } from "node:os";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

// Other machines on the network reach the dev server by this machine's name,
// which mDNS advertises with a .local suffix.
const machine = hostname().toLowerCase();

// The Go server answers /version with the date the frontend was built, and
// the app shows a "new version" banner when it changes. The dev server always
// answers "development", so the banner never shows while developing.
function developmentVersion(): Plugin {
  return {
    name: "development-version",
    configureServer(server) {
      server.middlewares.use("/version", (_req, res) => {
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end("development");
      });
    },
  };
}

export default defineConfig({
  // The dev launcher sets this per worktree (see app/utils/token.ts). Builds
  // for production and the tests leave it empty.
  define: {
    __TOKEN_NAMESPACE__: JSON.stringify(
      process.env.POKEDEXTRACKER_TOKEN_NAMESPACE ?? "",
    ),
  },
  root: "app",
  publicDir: "../public",
  build: {
    // The Go binary embeds this directory (internal/webapp). The build script
    // puts back the tracked .gitkeep, which keeps it present for builds
    // without a frontend.
    outDir: "../internal/webapp/dist",
    emptyOutDir: true,
    sourcemap: true,
    // The app ships as one bundle, so Vite's warning about chunks over 500 kB
    // would show on every build. Splitting the bundle is its own change.
    chunkSizeWarningLimit: 3000,
  },
  clearScreen: false,
  plugins: [react(), tailwindcss(), developmentVersion()],
  server: {
    allowedHosts: [machine, `${machine}.local`],
    host: true,
    // The dev launcher (cmd/dev) picks free ports per worktree and passes them
    // in. API_URL is the server /api goes to: the local API, or staging for
    // `mise start:web:staging`. Both serve the API under /api.
    port: Number(process.env.WEB_PORT) || 9898,
    strictPort: true,
    proxy: {
      "/api": {
        target: process.env.API_URL || "http://127.0.0.1:8647",
        changeOrigin: true,
      },
    },
  },
});
