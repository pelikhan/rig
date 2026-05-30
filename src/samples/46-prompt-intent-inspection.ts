import { agent, s, p } from "rig";

// Matches changed files against CODEOWNERS rules and returns suggested owners
// along with any files that have no matching ownership rule.
const owners = agent({
    name: "owners",
    input: s.object({
        codeowners: s.string,
        changedFiles: s.string
    }),
    output: s.object({
        owners: s.array(s.string),
        unmatchedFiles: s.array(s.string)
    }),
    instructions: `Suggest owners for changed files.`,
});

export default owners;
