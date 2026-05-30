# 16 - Docs Gap Analysis

```rig
import { agent, p, s } from "rig";
// Agent role: compare public API declarations and identify breaking changes.
const apiDiff = agent({
    name: "apiDiff",
    model: "mini",
    input: s.object({
        before: s.string,
        after: s.string
    }),
    output: s.object({
        breaking: s.boolean,
        summary: s.string,
        changes: s.array(s.string)
    }),
    instructions: `Compare public API declarations and identify breaking changes.`,
});
await apiDiff({
    before: p.bash("git show origin/main:dist/index.d.ts"),
    after: p.bash("cat dist/index.d.ts"),
});

export default apiDiff;
```
