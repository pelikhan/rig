import { agent, sh } from "rig";

const upgradePlan = agent("upgradePlan", {
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
