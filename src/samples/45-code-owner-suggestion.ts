import { agent, s, p } from "rig";

// Analyzes historical test run logs to determine whether a failure is likely
// flaky, surfacing signals and suggesting stabilization ideas.
const flaky = agent({
    name: "flakyAnalysis",
    input: s.object({
        history: s.string
    }),
    output: s.object({
        likelyFlaky: s.boolean,
        signals: s.array(s.string),
        stabilizationIdeas: s.array(s.string)
    }),
    instructions: `Analyze whether the test failure appears flaky.`,
});

export default flaky;
