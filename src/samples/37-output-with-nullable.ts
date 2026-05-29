import { agent } from "rig";
import { sh } from "rig";

const summarizeDiff = agent({
  name: "summarizeDiff",
  input: { diff: "git diff" },
  output: { summary: "diff summary", files: ["file"] },
  instructions: `Summarize the diff.`,
});

const reviewer = agent({
  name: "reviewer",
  input: { diff: "git diff" },
  output: { summary: "review summary", issues: ["issue"] },
  agents: { summarizeDiff },
  instructions: `Review the diff. You may use the provided subagent conceptually.`,
});

console.log(await reviewer({
  diff: sh.text("git diff -- ."),
}));
