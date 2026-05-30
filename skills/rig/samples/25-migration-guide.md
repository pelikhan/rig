# 25 - Migration Guide

```rig
import { agent, s } from "rig";
const improve = agent({
    name: "improveError",
    input: s.object({
        message: s.string,
        context: s.optional(s.string)
    }),
    output: s.object({
        message: s.string,
        explanation: s.string
    }),
    instructions: `Rewrite the error to be actionable and precise.`,
});
console.log(await improve({
    message: "bad output",
    context: "Validation failed for optional underscore field.",
}));

export default improve;
```
