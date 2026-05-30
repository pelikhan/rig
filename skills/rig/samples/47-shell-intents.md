# 47 - Shell Intents

```rig
import { agent, p, s } from "rig";

// Agent role: summarize the current git workspace changes.

const shellIntents = agent({
  name: "shellIntents",
  model: "mini",
  instructions: "Summarize the current git workspace changes.",
  input: s.object({
    diff: s.string,
    status: s.string,
  }),
  output: s.object({
    summary: s.string,
    changedFiles: s.array(s.string),
  }),
});

await shellIntents({
  diff: p.bash("git diff -- ."),
  status: p.bash("git status --short"),
});

export default shellIntents;
```
