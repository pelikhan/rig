import { agent, s } from "rig";
import { p } from "rig";
const Diagnosis = s.object({
    rootCause: s.string,
    confidence: s.number
});
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
const d = await diagnose({ test: p.result("npm test") });
const f = await fix({ diagnosis: d });
const r = await review({ diff: p.text("git diff -- ."), diagnosis: d });
console.log({ d, f, r });
