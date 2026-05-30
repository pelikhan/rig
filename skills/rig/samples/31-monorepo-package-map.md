# 31 - Monorepo Package Map

```rig
import { agent, p, s } from "rig";
// Agent role: review the workflow for reliability, caching, and least privilege.
const actionReview = agent({
    name: "actionReview",
    model: "mini",
    input: s.object({
        workflow: s.string
    }),
    output: s.object({
        summary: s.string,
        problems: s.array(s.string),
        improvements: s.array(s.string)
    }),
    instructions: `Review the workflow for reliability, caching, and least privilege.`,
});
await actionReview({
    workflow: p.bash("cat .github/workflows/*.yml .github/workflows/*.yaml 2>/dev/null || true"),
});

export default actionReview;
```
