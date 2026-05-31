import { agent, s } from "rig";
// Agent role: convert the change description to Keep a Changelog style.
const categorize = agent({
    name: "categorizeChange",
    model: "mini",
    input: s.string,
    output: s.object({
        category: s.enum("added", "changed", "deprecated", "removed", "fixed", "security"),
        entry: s.string
    }),
    instructions: `Convert the change description to Keep a Changelog style.`,
});

export default categorize;
