import { agent, s, p } from "rig";

// Plans safe dependency upgrades by comparing current versions against the latest,
// returning a prioritized list with risk ratings.
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

export default upgradePlan;
