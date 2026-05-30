import { agent, s } from "rig";
import { p } from "rig";

const triage = agent({
  name: "triage",
  input: {
    diff: "Pull request diff",
    files: "Changed files",
  },
  output: {
    area: s.enum("runtime", "docs", "tests", "ci", "unknown"),
    risk: s.enum("low", "medium", "high"),
    reviewers: ["team or person"],
    reason: "Why these reviewers fit",
  },
  instructions: `Triage the pull request and recommend reviewers.`,
});

console.log(await triage({
  diff: p.text("git diff origin/main...HEAD"),
  files: p.text("git diff --name-only origin/main...HEAD"),
}));
