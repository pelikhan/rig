import { agent, s, p } from "rig";

// Diagnoses a CI log by pinpointing the first real failure, proposing a likely
// cause, and listing commands to try locally.
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

export default ciDiagnosis;
