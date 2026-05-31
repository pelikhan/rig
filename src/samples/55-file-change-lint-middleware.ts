import { agent, s } from "rig";
import type { AgentAddon } from "rig";
import { $ } from "zx";

async function workspaceFingerprint(): Promise<string> {
  try {
    const { stdout } = await $`git status --porcelain`;
    return stdout.trim();
  } catch {
    return "";
  }
}

function lintOnFileChange(): AgentAddon {
  return async (_context, next) => {
    const before = await workspaceFingerprint();
    await next();
    const after = await workspaceFingerprint();
    if (before !== after) {
      await $`npm run typecheck`;
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
  addons: lintOnFileChange(),
});

await fileChangeMiddleware("Inspect the workspace and apply a small fix if needed.");

export default fileChangeMiddleware;
