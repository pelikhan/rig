# 47 - Shell Intents

```rig
import { agent, p, s } from "rig";

// Agent role: summarize the current git workspace changes.

const shellIntents = agent({
  name: "shellIntents",
  model: "mini",
  instructions: "Summarize the current git workspace changes.",
  output: s.object({
    summary: s.string,
    changedFiles: s.array(s.string),
  }),
});

export default shellIntents;
```
