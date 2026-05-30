import { agent, s } from "rig";

// Extracts a clear reproduction recipe from a GitHub issue, listing steps,
// expected vs actual behavior, and any missing information.
const reproducer = agent({
    name: "reproducer",
    input: s.object({
        issueTitle: s.string,
        issueBody: s.string
    }),
    output: s.object({
        steps: s.array(s.string),
        expected: s.string,
        actual: s.string,
        missingInfo: s.array(s.string)
    }),
    instructions: `Extract a clear reproduction from the issue.`,
});

export default reproducer;
