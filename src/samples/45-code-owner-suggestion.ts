import { agent, sh } from "rig";

const flaky = agent("flakyAnalysis", {
  input: { history: "recent test outputs" },
  output: {
    likelyFlaky: true,
    signals: ["signal"],
    stabilizationIdeas: ["idea"],
  },
  instructions: `Analyze whether the test failure appears flaky.`,
});

console.log(await flaky({
  history: sh.text("cat test-runs/*.log 2>/dev/null || true"),
}));
