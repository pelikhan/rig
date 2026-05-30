# 51 - Subagent Task Harness for Rig Markdown

```rig
import { agent, s } from "rig";
// Agent role: draft a runnable rig markdown snippet for the requested task.
const draftRigMarkdown = agent({
  name: "draftRigMarkdown",
  model: "mini",
  input: s.object({ task: s.string }),
  output: s.object({ markdown: s.string }),
  instructions: "Return exactly one markdown response with one ```rig fenced block.",
});
// Agent role: solve the task by delegating to subagents and returning markdown.
const solveTask = agent({
  name: "solveTask",
  model: "large",
  output: s.object({ markdown: s.string }),
  agents: { draftRigMarkdown },
  instructions: "Use the subagent to resolve the task and return a runnable rig markdown snippet.",
});
export default solveTask;
```
