# 14 - Changelog Categorizer

```rig
import { agent, s } from "rig";
import { p } from "rig";
const planner = agent({
    name: "testPlanner",
    input: s.object({
        diff: s.string,
        packageJson: s.string
    }),
    output: s.object({
        commands: s.array(s.string),
        manualChecks: s.array(s.string),
        rationale: s.string
    }),
    instructions: `Create a focused validation plan for the current changes.`,
});
console.log(await planner({
    diff: p.bash("git diff -- ."),
    packageJson: p.bash("cat package.json"),
}));

export default planner;
```
