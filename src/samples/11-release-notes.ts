import { agent, sh } from "rig";

const triage = agent("triage", {
  input: {
    diff: "Pull request diff",
    files: "Changed files",
  },
  output: {
    area: agent.enum(["runtime", "docs", "tests", "ci", "unknown"]),
    risk: agent.enum(["low", "medium", "high"]),
    reviewers: ["team or person"],
    reason: "Why these reviewers fit",
  },
  instructions: `Triage the pull request and recommend reviewers.`,
});

console.log(await triage({
  diff: sh.text("git diff origin/main...HEAD"),
  files: sh.text("git diff --name-only origin/main...HEAD"),
}));
