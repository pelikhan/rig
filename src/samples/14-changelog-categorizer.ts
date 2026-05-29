import { agent, s } from "rig";
import { sh } from "rig/sh";

const planner = agent({
  name: "testPlanner",
  input: {
    diff: "git diff text",
    packageJson: "package metadata",
  },
  output: {
    commands: ["npm test"],
    manualChecks: ["Manual check"],
    rationale: "Why these tests are enough",
  },
  instructions: `Create a focused validation plan for the current changes.`,
});

console.log(await planner({
  diff: sh.text("git diff -- ."),
  packageJson: sh.text("cat package.json"),
}));
