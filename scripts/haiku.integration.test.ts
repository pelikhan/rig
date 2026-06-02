import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const token = process.env["COPILOT_GITHUB_TOKEN"];
const itWithToken = token ? it : it.skip;
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const samplePath = resolve(repoRoot, "src/samples/01-single-agent-haiku.ts");
const launcherPath = resolve(repoRoot, "skills/rig/rig.ts");
const INTEGRATION_TIMEOUT_MS = 120_000;

async function runHaikuSample(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [launcherPath, samplePath, "--server"],
      {
        cwd: repoRoot,
        env: { ...process.env, COPILOT_GITHUB_TOKEN: token },
      },
    );

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("Timed out waiting for haiku integration run."));
    }, INTEGRATION_TIMEOUT_MS);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`Haiku integration run failed with exit code ${code}.\n${stderr}`));
        return;
      }
      resolve(stdout);
    });

    child.stdin.end(prompt);
  });
}

describe("rig runtime integration", () => {
  itWithToken(
    "runs a single-agent haiku sample with the real runtime",
    async () => {
      const stdout = await runHaikuSample("autumn rain on city windows");
      const result = JSON.parse(stdout) as { haiku: string };
      expect(typeof result.haiku).toBe("string");
      const lines = result.haiku
        .split(/\r?\n/g)
        .map((line) => line.trim())
        .filter(Boolean);
      expect(lines).toHaveLength(3);
    },
    INTEGRATION_TIMEOUT_MS,
  );
});
