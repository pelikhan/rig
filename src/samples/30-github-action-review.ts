import { agent } from "rig";
import { p } from "rig";

const bugReport = agent({
  name: "bugReport",
  input: {
    failure: "test failure",
    environment: "environment details",
  },
  output: {
    title: "Bug title",
    body: "Markdown issue body",
    labels: ["bug"],
  },
  instructions: `Draft a GitHub bug report from the failure details.`,
});

console.log(await bugReport({
  failure: p.text("npm test 2>&1 || true"),
  environment: p.text("node --version && npm --version && uname -a"),
}));
