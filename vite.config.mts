import { hostname } from "node:os";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { type Plugin } from "vite";
import { defineConfig } from "vitest/config";

// Other machines on the network reach the dev server by this machine's name,
// which mDNS advertises with a .local suffix.
const machine = hostname().toLowerCase();

// The Go server answers /version with an ID for the frontend build, and the
// app shows a "new version" banner when it stops matching the build the page
// loaded with. The dev server always answers "development", the same as the
// development config's build (config/development.ts), so the banner never
// shows while developing.
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
    // The app ships as one bundle, a little over Vite's default limit of
    // 500 kB. This limit still warns when a dependency makes it jump, like
    // the 2 MB table the slug package used to bring in.
    chunkSizeWarningLimit: 1000,
  },
  clearScreen: false,
  plugins: [
    react(),
    tailwindcss(),
    developmentVersion(),
    // Stamps each script and its source map with a matching debug ID, so
    // Sentry can pair them up whichever host serves the script. It only
    // stamps: the deploy script uploads the source maps (scripts/deploy.sh),
    // and the release is the deploy version, set when Sentry starts
    // (app/utils/sentry.ts). An empty release name keeps the plugin from
    // naming one after the git commit and warning that it can't create it.
    sentryVitePlugin({
      release: { name: "", inject: false },
      sourcemaps: { disable: "disable-upload" },
      telemetry: false,
    }),
  ],
  // Unit tests sit next to the code they test in app/. The end-to-end tests in
  // e2e/ are Playwright's.
  test: {
    include: ["**/*.test.ts"],
  },
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
