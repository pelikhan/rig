# 55 - File Change Lint Middleware

```rig
import { agent, s, type AgentAddon } from "rig";
import { $ } from "zx";

const fingerprint = async () => {
  try { return (await $`git status --porcelain`).stdout.trim(); } catch { return ""; }
};
const lintOnFileChange = (): AgentAddon => async (_context, next) => {
  const before = await fingerprint();
  await next();
  const after = await fingerprint();
  if (before !== after) await $`npm run typecheck`;
};

// Agent role: update files and run linting after file changes.
const fileChangeMiddleware = agent({
  name: "fileChangeMiddleware",
  model: "mini",
  instructions: "Update files when needed, then summarize the change.",
  output: s.object({ changed: s.boolean, summary: s.string }),
  addons: lintOnFileChange(),
});

export default fileChangeMiddleware;
```
