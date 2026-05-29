import { agent, sh } from "rig";

const reviewer = agent("reviewer", {
  input: {
    diff: "git diff text",
    status_: "git status output",
  },
  output: {
    summary: "Review summary",
    risk: agent.enum(["low", "medium", "high"]),
    findings: [{
      severity: agent.enum(["info", "warning", "error"]),
      message: "Actionable finding",
      file_: "src/index.ts",
      line_: 42,
    }],
    tests: ["Suggested regression test"],
  },
  instructions: `
    Review input.diff for correctness and regression risks.
    Return only the declared output shape.
  `,
});

const review = await reviewer({
  diff: sh.text("git diff -- ."),
  status: sh.text("git status --short"),
});

console.log(review);
