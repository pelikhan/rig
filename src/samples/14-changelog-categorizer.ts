import { agent, s, p } from "rig";

// Builds a focused validation plan for the current diff, listing test commands
// and manual checks required before merging.
const planner = agent({
    name: "testPlanner",
    input: s.object({
        diff: s.string,
        packageJson: s.string
    }),
    output: s.object({
        commands: s.array(s.string),
        manualChecks: s.array(s.string),
        rationale: s.string
    }),
    instructions: `Create a focused validation plan for the current changes.`,
});

export default planner;
