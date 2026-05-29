import { agent, s } from "rig";
import { sh } from "rig/sh";

const upgradePlan = agent({
  name: "upgradePlan",
  input: {
    packageJson: "package.json",
    outdated: "npm outdated output",
  },
  output: {
    upgrades: [{ package: "name", from: "old", to: "new", risk: "risk" }],
    order: ["package"],
  },
  instructions: `Plan safe dependency upgrades.`,
});

console.log(await upgradePlan({
  packageJson: sh.text("cat package.json"),
  outdated: sh.text("npm outdated || true"),
}));
