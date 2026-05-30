import { agent, s } from "rig";

// Converts a free-form finding string into a typed review record with a fixed
// literal kind discriminant and a severity level.
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

export default reviewRecord;
