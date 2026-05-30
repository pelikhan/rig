import { agent, s } from "rig";
import { p } from "rig";
const ciDiagnosis = agent({
    name: "ciDiagnosis",
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
console.log(await ciDiagnosis({
    log: p.bash("cat ci.log", { purpose: "read CI log" }),
}));

export default ciDiagnosis;
