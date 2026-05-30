# 02 - Review Git Diff

```rig
import { agent, p, s } from "rig";

// Agent role: review the repository diff and return a structured summary.

const reviewDiff = agent({
  name: "reviewDiff",
  model: "mini",
  instructions: "Review the repository diff and return a structured summary.",
  output: s.object({
    summary: s.string,
    findings: s.array(s.object({
      file: s.string,
      line: s.optional(s.number),
      message: s.string,
    })),
  }),
});

export default reviewDiff;
```
