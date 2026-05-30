# 19 - Fix Then Review

```rig
import { agent, p, s } from "rig";
// Agent role: return a complete replacement for the target file.
const patcher = agent({
    name: "patcher",
    model: "mini",
    output: s.object({
        path: s.string,
        contents: s.string,
        summary: s.string
    }),
    instructions: `Return a complete replacement for the target file.`,
    permissions: { write: "workspace" },
});

export default patcher;
```
