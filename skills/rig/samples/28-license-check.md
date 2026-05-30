# 28 - License Check

```rig
import { agent, s } from "rig";
import { p } from "rig";
const upgradePlan = agent({
    name: "upgradePlan",
    input: s.object({
        packageJson: s.string,
        outdated: s.string
    }),
    output: s.object({
        upgrades: s.array(s.object({
            package: s.string,
            from: s.string,
            to: s.string,
            risk: s.string
        })),
        order: s.array(s.string)
    }),
    instructions: `Plan safe dependency upgrades.`,
});
console.log(await upgradePlan({
    packageJson: p.bash("cat package.json"),
    outdated: p.bash("npm outdated || true"),
}));

export default upgradePlan;
```
