import { agent, s, p } from "rig";

// Reviews a git diff for correctness and regression risk, returning a risk level,
// per-finding diagnostics, and a list of suggested test cases.
const reviewer = agent({
    name: "reviewer",
    input: s.object({
        diff: s.string,
        status: s.optional(s.string)
    }),
    output: s.object({
        summary: s.string,
        risk: s.enum("low", "medium", "high"),
        findings: s.array(s.object({
            severity: s.enum("info", "warning", "error"),
            message: s.string,
            file: s.optional(s.string),
            line: s.optional(s.number)
        })),
        tests: s.array(s.string)
    }),
    instructions: `
    Review input.diff for correctness and regression risks.
    Return only the declared output shape.
  `,
});

export default reviewer;
