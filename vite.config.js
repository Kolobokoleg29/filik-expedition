import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";

const staticDataFiles = ["levels.json", "endless-levels.json", "build.json", "live-config.json"];

function copyStaticGameFiles() {
  return {
    name: "copy-static-game-files",
    apply: "build",
    closeBundle() {
      const outDir = path.resolve("dist");
      fs.cpSync(path.resolve("assets"), path.join(outDir, "assets"), { recursive: true });
      for (const file of staticDataFiles) {
        fs.copyFileSync(path.resolve(file), path.join(outDir, file));
      }
    }
  };
}

export default defineConfig({
  base: "./",
  publicDir: false,
  plugins: [copyStaticGameFiles()],
  server: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 750
  }
});