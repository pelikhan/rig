import { agent, p, s } from "rig";
// Agent role: decide whether snapshot updates are legitimate.
const snapshotReview = agent({
    name: "snapshotReview",
    model: "typecheck",
    output: s.object({
        safeToUpdate: s.boolean,
        reason: s.string,
        command: s.optional(s.string)
    }),
    instructions: `Decide whether snapshot updates are legitimate.`,
});

export default snapshotReview;
