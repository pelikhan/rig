import { agent, s, p } from "rig";

// Drafts a ready-to-file GitHub bug report from a test failure and environment
// details, including suggested labels.
const bugReport = agent({
    name: "bugReport",
    input: s.object({
        failure: s.string,
        environment: s.string
    }),
    output: s.object({
        title: s.string,
        body: s.string,
        labels: s.array(s.string)
    }),
    instructions: `Draft a GitHub bug report from the failure details.`,
});

export default bugReport;
