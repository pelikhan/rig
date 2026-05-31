# 02 - Review Git Diff

```rig
import { p } from "rig";

// Agent role: review the repository diff and return a structured summary.

export default p`Review the repository diff from ${p.bash("git diff --stat")} and return a concise summary with key findings.`;
```
