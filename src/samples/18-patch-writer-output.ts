import { agent, s, p } from "rig";

// Plans a minimal, low-risk refactoring for a given target description, listing
// ordered steps, affected files, and potential risks.
const refactorPlan = agent({
    name: "refactorPlan",
    input: s.object({
        files: s.string,
        target: s.string
    }),
    output: s.object({
        steps: s.array(s.string),
        files: s.array(s.string),
        risks: s.array(s.string)
    }),
    instructions: `Plan a minimal, low-risk refactor. Do not edit files.`,
});

export default refactorPlan;
