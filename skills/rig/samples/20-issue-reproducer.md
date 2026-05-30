# 20 - Issue Reproducer

```rig
import { agent, p, s } from "rig";
const Diagnosis = s.object({
    rootCause: s.string,
    confidence: s.number
});
// Agent role: diagnose the test failure.
const diagnose = agent({
    name: "diagnose",
    model: "mini",
    output: Diagnosis,
    instructions: `Diagnose the test failure.`,
});
// Agent role: make the smallest safe patch using engine capabilities.
const fix = agent({
    name: "fix",
    model: "mini",
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
// Agent role: review the patch against the diagnosis.
const review = agent({
    name: "review",
    model: "mini",
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
```
