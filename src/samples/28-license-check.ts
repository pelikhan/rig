import { agent } from "rig";
import { p } from "rig";

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
  packageJson: p.text("cat package.json"),
  outdated: p.text("npm outdated || true"),
}));
