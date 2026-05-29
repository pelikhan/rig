import { agent } from "rig";

const reproducer = agent({
  name: "reproducer",
  input: {
    issueTitle: "Issue title",
    issueBody: "Issue body",
  },
  output: {
    steps: ["Step to reproduce"],
    expected: "Expected behavior",
    actual: "Actual behavior",
    missingInfo: ["Question for reporter"],
  },
  instructions: `Extract a clear reproduction from the issue.`,
});

console.log(await reproducer({
  issueTitle: "Install fails on Windows",
  issueBody: "npm install errors with EPERM when postinstall runs.",
}));
