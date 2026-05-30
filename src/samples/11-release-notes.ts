import { agent, s, p } from "rig";

// Triages a pull request by examining its diff and changed files, then recommends
// a domain area, risk level, and suitable reviewers.
const triage = agent({
    name: "triage",
    input: s.object({
        diff: s.string,
        files: s.string
    }),
    output: s.object({
        area: s.enum("runtime", "docs", "tests", "ci", "unknown"),
        risk: s.enum("low", "medium", "high"),
        reviewers: s.array(s.string),
        reason: s.string
    }),
    instructions: `Triage the pull request and recommend reviewers.`,
});

export default triage;
