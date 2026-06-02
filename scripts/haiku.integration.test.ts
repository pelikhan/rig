import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const token = process.env["COPILOT_GITHUB_TOKEN"];
const itWithToken = token ? it : it.skip;
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const samplePath = resolve(repoRoot, "src/samples/01-single-agent-haiku.ts");

async function runHaikuSample(prompt: string): Promise<string> {
  return await new Promise((resolveOutput, rejectOutput) => {
    const child = spawn(
      process.execPath,
      ["skills/rig/rig.ts", samplePath, "--server"],
      {
        cwd: repoRoot,
        env: { ...process.env, COPILOT_GITHUB_TOKEN: token },
      },
    );

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      rejectOutput(new Error("Timed out waiting for haiku integration run."));
    }, 120000);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      rejectOutput(error);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        rejectOutput(new Error(`Haiku integration run failed with exit code ${code}.\n${stderr}`));
        return;
      }
      resolveOutput(stdout);
    });

    child.stdin.end(prompt);
  });
}

describe("integration launcher runtime", () => {
  itWithToken("runs a single-agent haiku sample with the real runtime", async () => {
    const stdout = await runHaikuSample("autumn rain on city windows");
    const result = JSON.parse(stdout) as { haiku: string };
    expect(typeof result.haiku).toBe("string");
    const lines = result.haiku
      .split(/\r?\n/g)
      .map((line) => line.trim())
      .filter(Boolean);
    expect(lines).toHaveLength(3);
  });
});
