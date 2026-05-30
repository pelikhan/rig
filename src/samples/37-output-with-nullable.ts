import { agent, s, p } from "rig";

// Summarizes a diff into a list of changed files and a short description;
// used as a subagent by the reviewer.
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

// Reviews a raw diff string, optionally delegating to summarizeDiff, and returns
// a high-level summary alongside a list of issues found.
const reviewer = agent({
    name: "reviewer",
    input: s.string,
    output: s.object({
        summary: s.string,
        issues: s.array(s.string)
    }),
    agents: { summarizeDiff },
    instructions: `Review the diff. You may use the provided subagent conceptually.`,
});

export default reviewer;
