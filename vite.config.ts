// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// A plugin to copy _shell.html to index.html after Vite build completes
const copyShellToIndexPlugin = () => ({
  name: "copy-shell-to-index",
  closeBundle() {
    const clientDir = path.resolve(__dirname, "dist/client");
    const shellPath = path.resolve(clientDir, "_shell.html");
    const indexPath = path.resolve(clientDir, "index.html");
    
    if (fs.existsSync(shellPath)) {
      try {
        fs.copyFileSync(shellPath, indexPath);
        console.log("Successfully copied _shell.html to index.html inside dist/client");
      } catch (err) {
        console.error("Error copying _shell.html to index.html:", err);
      }
    } else {
      console.warn("Warning: _shell.html not found in dist/client");
    }
  }
});

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    spa: {
      enabled: true,
    },
  },
  vite: {
    plugins: [
      copyShellToIndexPlugin()
    ],
    server: {
      proxy: {
        "/api": {
          target: "http://localhost:5000",
          changeOrigin: true,
        },
      },
    },
  },
});
