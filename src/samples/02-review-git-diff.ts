import { agent, s } from "rig";
import { sh } from "rig/sh";

const reviewDiff = agent({
  name: "reviewDiff",
  instructions: "Review the repository diff and return a structured summary.",
  input: s.object({
    diff: s.string,
    status: s.string,
  }),
  output: s.object({
    summary: s.string,
    findings: s.array(s.object({
      file: s.string,
      line: s.optional(s.number),
      message: s.string,
    })),
  }),
});

const result = await reviewDiff({
  diff: sh.text("git diff --stat"),
  status: sh.text("git status --short"),
});

console.log(result.summary);
console.log(result.findings);
