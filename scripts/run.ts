/**
 * Run a rig sample for real using the Copilot SDK engine.
 *
 * Usage:
 *   npm run sample:run -- src/samples/02-review-git-diff.ts
 *   npm run sample:run -- 02
 */
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { readdirSync } from "fs";
import { launchRigProgram } from "../src/launcher.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sampleDir = resolve(__dirname, "../src/samples");

const arg = process.argv[2];
if (!arg) {
  console.error("Usage: npm run sample:run -- <sample-file-or-number>");
  console.error("Examples:");
  console.error("  npm run sample:run -- 02");
  console.error("  npm run sample:run -- src/samples/02-review-git-diff.ts");
  process.exit(1);
}

// Resolve sample path from number or full path
let samplePath: string;
if (arg.endsWith(".ts")) {
  samplePath = resolve(arg);
} else {
  const files = readdirSync(sampleDir).filter((f) => f.startsWith(arg.padStart(2, "0")));
  if (files.length === 0) {
    console.error(`No sample matching "${arg}" found in ${sampleDir}`);
    process.exit(1);
  }
  samplePath = resolve(sampleDir, files[0]);
}

console.error(`▶ Running: ${samplePath}`);
const start = performance.now();

try {
  await launchRigProgram(samplePath);
} catch (err: any) {
  console.error(`✗ Failed (${(performance.now() - start).toFixed(0)}ms)`);
  console.error(err?.message ?? err);
  process.exit(1);
}

console.error(`✓ Done (${(performance.now() - start).toFixed(0)}ms)`);
