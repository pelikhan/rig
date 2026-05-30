import { agent, p, s } from "rig";
// Agent role: suggest owners for changed files.
const owners = agent({
    name: "owners",
    model: "typecheck",
    output: s.object({
        owners: s.array(s.string),
        unmatchedFiles: s.array(s.string)
    }),
    instructions: `Suggest owners for changed files.`,
});

export default owners;
