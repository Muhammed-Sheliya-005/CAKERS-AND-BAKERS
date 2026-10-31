import fs from "node:fs";
import path from "node:path";

if (!process.env.VERCEL) {
  console.log("[Vercel] Skipping root public asset copy outside Vercel builds.");
  process.exit(0);
}

const projectRoot = process.cwd();
const source = path.join(projectRoot, "dist", "public");
const destination = path.join(projectRoot, "public");

if (!fs.existsSync(path.join(source, "index.html"))) {
  throw new Error("Vite did not produce dist/public/index.html.");
}

fs.mkdirSync(destination, { recursive: true });
fs.cpSync(source, destination, { recursive: true, force: true });
const staticPlatformConfig = path.join(
  destination,
  "api",
  "platform",
  "config.js"
);
if (fs.existsSync(staticPlatformConfig)) fs.rmSync(staticPlatformConfig);
console.log("[Vercel] Copied Vite static output to root public/.");
