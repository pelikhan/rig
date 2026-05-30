import { agent, p, s } from "rig";
// Agent role: parse coverage by file path.
const coverage = agent({
    name: "coverage",
    model: "typecheck",
    output: s.object({
        files: s.record(s.object({
            lines: s.number,
            branches: s.number,
            notes: s.optional(s.string)
        }))
    }),
    instructions: `Parse coverage by file path.`,
});

export default coverage;
