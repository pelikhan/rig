import { agent, s } from "rig";
import { p } from "rig";
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
console.log(await coverage({
    report: p.bash("cat coverage/coverage-summary.json"),
}));

export default coverage;
