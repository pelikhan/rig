import { agent, s, p } from "rig";

// Parses a coverage report into a per-file record of line and branch percentages,
// demonstrating s.record for map-shaped output values.
const coverage = agent({
    name: "coverage",
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

export default coverage;
