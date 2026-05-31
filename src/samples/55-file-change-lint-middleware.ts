import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { agent, s } from "rig";
import type { AgentAddon } from "rig";

const execFileAsync = promisify(execFile);

async function workspaceFingerprint(): Promise<string> {
  try {
    const { stdout } = await execFileAsync("git", ["status", "--porcelain"]);
    return stdout.trim();
  } catch {
    return "";
  }
}

function lintOnFileChange(lintCommand: string): AgentAddon {
  return async (_context, next) => {
    const before = await workspaceFingerprint();
    await next();
    const after = await workspaceFingerprint();
    if (before !== after) {
      await execFileAsync("sh", ["-lc", lintCommand]);
    }
  };
}

// Agent role: apply workspace changes and trigger linting when files changed.
const fileChangeMiddleware = agent({
  name: "fileChangeMiddleware",
  model: "mini",
  instructions: "Update files when needed, then summarize the change.",
  output: s.object({
    changed: s.boolean,
    summary: s.string,
  }),
  addons: lintOnFileChange("npm run typecheck"),
});

await fileChangeMiddleware("Inspect the workspace and apply a small fix if needed.");

export default fileChangeMiddleware;
