import { agent, s } from "rig";
import { p } from "rig";
const summarizeDiff = agent({
    name: "summarizeDiff",
    input: s.object({
        diff: s.string
    }),
    output: s.object({
        summary: s.string,
        files: s.array(s.string)
    }),
    instructions: `Summarize the diff.`,
});
const reviewer = agent({
    name: "reviewer",
    input: s.object({
        diff: s.string
    }),
    output: s.object({
        summary: s.string,
        issues: s.array(s.string)
    }),
    agents: { summarizeDiff },
    instructions: `Review the diff. You may use the provided subagent conceptually.`,
});
console.log(await reviewer({
    diff: p.bash("git diff -- ."),
}));

export default summarizeDiff;
