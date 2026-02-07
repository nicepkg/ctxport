import { defineConfig } from "tsup";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { TsconfigPathsPlugin } = require("@esbuild-plugins/tsconfig-paths");
import { copyFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const dir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  entry: [
    "src/**/*.ts",
    "src/**/*.tsx",
    "!src/**/*.test.*",
    "!src/**/*.spec.*",
    "!src/**/*.stories.*",
  ],
  format: ["esm"],
  bundle: true,
  tsconfig: "tsconfig.json",
  dts: {
    compilerOptions: {
      composite: false,
    },
  },
  clean: true,
  external: [
    "react",
    "react-dom",
    "react-hook-form",
    "recharts",
    "next-themes",
    "framer-motion",
    "shiki",
    "mermaid",
  ],
  treeshake: true,
  splitting: false,
  sourcemap: true,
  minify: false,
  esbuildOptions(options) {
    options.jsx = "automatic";
  },
  esbuildPlugins: [TsconfigPathsPlugin({ tsconfig: "tsconfig.json" })],
  async onSuccess() {
    // Copy CSS files to dist
    const cssFiles = [
      { src: "src/styles/globals.css", dist: "dist/styles/globals.css" },
      { src: "src/styles/renderer.css", dist: "dist/styles/renderer.css" },
    ];

    for (const { src, dist } of cssFiles) {
      const srcPath = join(dir, src);
      const distPath = join(dir, dist);

      if (existsSync(srcPath)) {
        const distDir = dirname(distPath);
        if (!existsSync(distDir)) {
          mkdirSync(distDir, { recursive: true });
        }
        copyFileSync(srcPath, distPath);
        console.log(`Copied ${src} to ${dist}`);
      }
    }
  },
});
