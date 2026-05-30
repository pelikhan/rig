import { agent, s } from "rig";
const reviewRecord = agent({
    name: "reviewRecord",
    input: s.object({
        finding: s.string
    }),
    output: s.object({
        kind: s.literal("review-finding"),
        finding: s.string,
        severity: s.enum("info", "warning", "error")
    }),
    instructions: `Convert the finding into a typed review record.`,
});
console.log(await reviewRecord({ finding: "No regression test covers the parser repair path." }));

export default reviewRecord;
