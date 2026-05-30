import { agent, s, p } from "rig";

const Diagnosis = s.object({
    rootCause: s.string,
    confidence: s.number
});

// Diagnoses a failing test run, returning a root cause and confidence score.
const diagnose = agent({
    name: "diagnose",
    input: s.object({
        test: s.object({
            ok: s.boolean,
            stdout: s.string,
            stderr: s.string,
            exitCode: s.number
        })
    }),
    output: Diagnosis,
    instructions: `Diagnose the test failure.`,
});

// Applies the smallest safe patch to fix the diagnosed issue, reporting whether
// any change was actually made.
const fix = agent({
    name: "fix",
    input: s.object({
        diagnosis: Diagnosis
    }),
    output: s.object({
        changed: s.boolean,
        summary: s.string
    }),
    instructions: `Make the smallest safe patch using engine capabilities.`,
    permissions: { shell: "ask", write: "workspace" },
});

// Reviews the applied patch against the original diagnosis, approving or flagging
// any remaining issues.
const review = agent({
    name: "review",
    input: s.object({
        diff: s.string,
        diagnosis: Diagnosis
    }),
    output: s.object({
        approved: s.boolean,
        issues: s.array(s.string)
    }),
    instructions: `Review the patch against the diagnosis.`,
});

export default diagnose;
