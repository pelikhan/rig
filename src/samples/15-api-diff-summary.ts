import { agent, s } from "rig";

// Converts a free-form change description into a Keep-a-Changelog-style entry
// with a standardized category.
const categorize = agent({
    name: "categorizeChange",
    input: s.object({
        text: s.string
    }),
    output: s.object({
        category: s.enum("added", "changed", "deprecated", "removed", "fixed", "security"),
        entry: s.string
    }),
    instructions: `Convert the change description to Keep a Changelog style.`,
});

export default categorize;
