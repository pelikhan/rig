import { agent, s } from "rig";
import { p } from "rig";
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
const review = await reviewer({
    diff: p.text("git diff -- ."),
    status: p.text("git status --short"),
});
console.log(review);
