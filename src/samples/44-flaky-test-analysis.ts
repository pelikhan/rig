import { agent, s, p } from "rig";

// Decides whether snapshot test updates are safe to commit by comparing test
// results against the snapshot diff, returning a rationale and optional update command.
const snapshotReview = agent({
    name: "snapshotReview",
    input: s.object({
        testResult: s.object({
            ok: s.boolean,
            stdout: s.string,
            stderr: s.string,
            exitCode: s.number
        }),
        diff: s.string
    }),
    output: s.object({
        safeToUpdate: s.boolean,
        reason: s.string,
        command: s.optional(s.string)
    }),
    instructions: `Decide whether snapshot updates are legitimate.`,
});

export default snapshotReview;
