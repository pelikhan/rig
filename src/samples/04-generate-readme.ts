import { agent, s, p } from "rig";

const ShResult = s.object({
    ok: s.boolean,
    stdout: s.string,
    stderr: s.string,
    exitCode: s.number
});

// Diagnoses a failing test run by identifying the root cause, confidence level,
// relevant files, and recommended next steps.
const diagnose = agent({
    name: "diagnose",
    input: s.object({
        test: ShResult
    }),
    output: s.object({
        rootCause: s.string,
        confidence: s.number,
        relevantFiles: s.array(s.string),
        nextSteps: s.array(s.string)
    }),
    instructions: `
    Diagnose the failing test result.
    Do not edit files.
  `,
});

export default diagnose;
