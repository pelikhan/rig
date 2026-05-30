import { agent, s } from "rig";
import { p } from "rig";
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
console.log(await flaky({
    history: p.text("cat test-runs/*.log 2>/dev/null || true"),
}));
