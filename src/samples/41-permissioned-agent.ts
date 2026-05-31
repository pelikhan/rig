import { agent, p, s } from "rig";
// Agent role: parse coverage by file path.
const coverage = agent({
    name: "coverage",
    model: "mini",
    input: s.object({
        report: s.string
    }),
    output: s.object({
        files: s.record(s.object({
            lines: s.number,
            branches: s.number,
            notes: s.optional(s.string)
        }))
    }),
    instructions: `Parse coverage by file path.`,
});
await coverage({
    report: p.read("coverage/coverage-summary.json"),
});

export default coverage;
