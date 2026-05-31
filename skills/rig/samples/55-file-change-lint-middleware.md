# 55 - File Change Lint Middleware

```rig
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { agent, s, type AgentAddon } from "rig";

const execFileAsync = promisify(execFile);
const lintOnFileChange = (lintCommand: string): AgentAddon => async (_context, next) => {
  const before = (await execFileAsync("git", ["status", "--porcelain"])).stdout.trim();
  await next();
  const after = (await execFileAsync("git", ["status", "--porcelain"])).stdout.trim();
  if (before !== after) await execFileAsync("sh", ["-lc", lintCommand]);
};

// Agent role: update files and run linting after file changes.
const fileChangeMiddleware = agent({
  name: "fileChangeMiddleware",
  model: "mini",
  instructions: "Update files when needed, then summarize the change.",
  output: s.object({ changed: s.boolean, summary: s.string }),
  addons: lintOnFileChange("npm run typecheck"),
});

export default fileChangeMiddleware;
```
