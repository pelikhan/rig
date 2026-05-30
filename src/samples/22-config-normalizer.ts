import { agent, p, s } from "rig";
// Agent role: diagnose the CI log. Prefer the first real failure over cascading errors.
const ciDiagnosis = agent({
    name: "ciDiagnosis",
    model: "mini",
    input: s.object({
        log: s.string
    }),
    output: s.object({
        failure: s.string,
        likelyCause: s.string,
        commandsToTry: s.array(s.string)
    }),
    instructions: `Diagnose the CI log. Prefer the first real failure over cascading errors.`,
});
await ciDiagnosis({
    log: p.bash("cat ci.log", { purpose: "read CI log" }),
});

export default ciDiagnosis;
