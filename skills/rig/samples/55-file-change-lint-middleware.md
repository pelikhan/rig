# 55 - File Change Lint Middleware

```rig
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { agent, s, type AgentAddon } from "rig";

const execFileAsync = promisify(execFile);
const fingerprint = async () => {
  try { return (await execFileAsync("git", ["status", "--porcelain"])).stdout.trim(); } catch { return ""; }
};
const lintOnFileChange = (lintCommand: [string, ...string[]]): AgentAddon => async (_context, next) => {
  const before = await fingerprint();
  await next();
  const after = await fingerprint();
  if (before !== after) await execFileAsync(lintCommand[0], lintCommand.slice(1));
};

// Agent role: update files and run linting after file changes.
const fileChangeMiddleware = agent({
  name: "fileChangeMiddleware",
  model: "mini",
  instructions: "Update files when needed, then summarize the change.",
  output: s.object({ changed: s.boolean, summary: s.string }),
  addons: lintOnFileChange(["npm", "run", "typecheck"]),
});

export default fileChangeMiddleware;
```
