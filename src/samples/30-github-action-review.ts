import { agent, sh } from "rig";

const bugReport = agent("bugReport", {
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
  failure: sh.text("npm test 2>&1 || true"),
  environment: sh.text("node --version && npm --version && uname -a"),
}));
