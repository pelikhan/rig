import { agent, s, p } from "rig";

// Identifies missing and stale documentation by comparing exported source symbols
// against existing markdown docs, and suggests quick fixes.
const docsGap = agent({
    name: "docsGap",
    input: s.object({
        source: s.string,
        docs: s.string
    }),
    output: s.object({
        missing: s.array(s.string),
        stale: s.array(s.string),
        quickFixes: s.array(s.string)
    }),
    instructions: `Find documentation gaps against the source API.`,
});

export default docsGap;
