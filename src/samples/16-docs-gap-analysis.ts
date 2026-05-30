import { agent, s, p } from "rig";

// Compares the public TypeScript API declarations between two versions, detecting
// breaking changes and summarising all modifications.
const apiDiff = agent({
    name: "apiDiff",
    input: s.object({
        before: s.string,
        after: s.string
    }),
    output: s.object({
        breaking: s.boolean,
        summary: s.string,
        changes: s.array(s.string)
    }),
    instructions: `Compare public API declarations and identify breaking changes.`,
});

export default apiDiff;
