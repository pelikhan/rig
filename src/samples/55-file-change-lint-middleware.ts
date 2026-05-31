import { agent, s } from "rig";
import type { AgentAddon } from "rig";
import { $, quote } from "zx";

async function workspaceFingerprint(): Promise<string> {
  try {
    const { stdout } = await $`git status --porcelain`;
    return stdout.trim();
  } catch {
    return "";
  }
}

async function runCommand(command: [string, ...string[]]): Promise<void> {
  const [name, ...args] = command;
  const escaped = [name, ...args].map((part) => quote(part)).join(" ");
  await $`${escaped}`;
}

function lintOnFileChange(lintCommand: [string, ...string[]]): AgentAddon {
  return async (_context, next) => {
    const before = await workspaceFingerprint();
    await next();
    const after = await workspaceFingerprint();
    if (before !== after) {
      await runCommand(lintCommand);
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
  addons: lintOnFileChange(["npm", "run", "typecheck"]),
});

await fileChangeMiddleware("Inspect the workspace and apply a small fix if needed.");

export default fileChangeMiddleware;
