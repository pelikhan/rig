import { agent, s } from "rig";

// Reviews a design proposal for simplicity and maintainability, returning an
// approve/revise/reject decision with strengths, concerns, and required changes.
const designReview = agent({
    name: "designReview",
    input: s.object({
        proposal: s.string
    }),
    output: s.object({
        decision: s.enum("approve", "revise", "reject"),
        strengths: s.array(s.string),
        concerns: s.array(s.string),
        requiredChanges: s.array(s.string)
    }),
    instructions: `Review the design proposal for simplicity and maintainability.`,
});

export default designReview;
