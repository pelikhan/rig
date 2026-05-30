# 27 - Dependency Upgrade Plan

```rig
import { agent, s } from "rig";
const designReview = agent({
    name: "designReview",
    input: s.object({
        proposal: s.string
    }),
    output: s.object({
        decision: s.enum("approve", "revise", "reject"),
        strengths: s.array(s.string),
        concerns: s.array(s.string),
        requiredChanges: s.array(s.string)
    }),
    instructions: `Review the design proposal for simplicity and maintainability.`,
});
console.log(await designReview({
    proposal: "Add a direct p.run helper for local execution.",
}));

export default designReview;
```
