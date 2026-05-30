import { agent, s } from "rig";
import { p } from "rig";
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
console.log(await snapshotReview({
    testResult: p.result("npm test -- --runInBand"),
    diff: p.bash("git diff -- '*snap*'"),
}));

export default snapshotReview;
