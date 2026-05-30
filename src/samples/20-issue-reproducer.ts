import { agent } from "rig";
import { p } from "rig";

const Diagnosis = {
  rootCause: "Likely root cause",
  confidence: 0.8,
};

const diagnose = agent({
  name: "diagnose",
  input: { test: { ok: true, stdout: "", stderr: "", exitCode: 0 } },
  output: Diagnosis,
  instructions: `Diagnose the test failure.`,
});

const fix = agent({
  name: "fix",
  input: { diagnosis: Diagnosis },
  output: { changed: true, summary: "Patch summary" },
  instructions: `Make the smallest safe patch using engine capabilities.`,
  permissions: { shell: "ask", write: "workspace" },
});

const review = agent({
  name: "review",
  input: { diff: "git diff", diagnosis: Diagnosis },
  output: { approved: true, issues: ["issue"] },
  instructions: `Review the patch against the diagnosis.`,
});

const d = await diagnose({ test: p.result("npm test") });
const f = await fix({ diagnosis: d });
const r = await review({ diff: p.text("git diff -- ."), diagnosis: d });

console.log({ d, f, r });
