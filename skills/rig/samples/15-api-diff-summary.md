# 15 - Api Diff Summary

```rig
import { agent, s } from "rig";
const categorize = agent({
    name: "categorizeChange",
    input: s.object({
        text: s.string
    }),
    output: s.object({
        category: s.enum("added", "changed", "deprecated", "removed", "fixed", "security"),
        entry: s.string
    }),
    instructions: `Convert the change description to Keep a Changelog style.`,
});
console.log(await categorize({ text: "Fix crash when config is missing." }));

export default categorize;
```
