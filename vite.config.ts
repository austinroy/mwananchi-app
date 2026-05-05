// @ts-nocheck
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, extname, join } from "node:path";

const require = createRequire(import.meta.url);
const tesseractWorkerPath = require.resolve("tesseract.js/dist/worker.min.js");
const tesseractCoreDirectory = dirname(
  require.resolve("tesseract.js-core/package.json"),
);

export default defineConfig({
  plugins: [react(), tesseractAssetsPlugin()],
});

function tesseractAssetsPlugin() {
  const coreFiles = readdirSync(tesseractCoreDirectory).filter((fileName) => {
    const extension = extname(fileName);
    return (
      fileName.startsWith("tesseract-core") &&
      (extension === ".js" || extension === ".wasm")
    );
  });

  return {
    name: "mwananchi-tesseract-assets",
    configureServer(server) {
      server.middlewares.use(
        "/ocr/tesseract-worker/worker.min.js",
        (_request, response) => {
          response.setHeader("content-type", "text/javascript");
          response.end(readFileSync(tesseractWorkerPath));
        },
      );

      server.middlewares.use(
        "/ocr/tesseract-core/",
        (request, response, next) => {
          const fileName = basename(request.url ?? "");
          const filePath = join(tesseractCoreDirectory, fileName);

          if (!coreFiles.includes(fileName) || !existsSync(filePath)) {
            next();
            return;
          }

          response.setHeader(
            "content-type",
            fileName.endsWith(".wasm") ? "application/wasm" : "text/javascript",
          );
          response.end(readFileSync(filePath));
        },
      );
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "ocr/tesseract-worker/worker.min.js",
        source: readFileSync(tesseractWorkerPath),
      });

      for (const fileName of coreFiles) {
        this.emitFile({
          type: "asset",
          fileName: `ocr/tesseract-core/${fileName}`,
          source: readFileSync(join(tesseractCoreDirectory, fileName)),
        });
      }
    },
  };
}
