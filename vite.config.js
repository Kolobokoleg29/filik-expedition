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
      const outAssets = path.join(outDir, "assets");
      fs.cpSync(path.resolve("assets/UI"), path.join(outAssets, "UI"), { recursive: true });
      const indexPath = path.join(outDir, "index.html");
      const index = fs.readFileSync(indexPath, "utf8");
      const canonicalIndex = index.replace(/\.\/assets\/app_icon-[^"]+\.png/g, "./assets/UI/app_icon.png");
      if (canonicalIndex !== index) fs.writeFileSync(indexPath, canonicalIndex);
      for (const file of fs.readdirSync(outAssets)) {
        if (/^app_icon-.*\.png$/.test(file)) fs.unlinkSync(path.join(outAssets, file));
      }
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
