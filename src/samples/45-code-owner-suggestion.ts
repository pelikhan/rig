import { agent, p, s } from "rig";
// Agent role: analyze whether the test failure appears flaky.
const flaky = agent({
    name: "flakyAnalysis",
    model: "mini",
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
await flaky({
    history: p.read("test-runs/*.log"),
});

export default flaky;
