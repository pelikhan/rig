import { agent, s, p } from "rig";

// Reads the current git diff and status, then produces a structured code-review
// summary with a human-readable overview and per-file findings.
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

export default reviewDiff;
