import { agent, p, s } from "rig";
const Diagnosis = s.object({ rootCause: s.string, confidence: s.number });
// Agent role: diagnose the failing test output.
const diagnose = agent({ name: "diagnose", model: "typecheck", input: s.object({ testLog: s.string }), output: Diagnosis, instructions: "Diagnose the failing test output." });
// Agent role: write the smallest safe patch for the diagnosis.
const fix = agent({ name: "fix", model: "typecheck", input: s.object({ diagnosis: Diagnosis }), output: s.object({ summary: s.string }), instructions: "Write the smallest safe patch.", permissions: { shell: "ask", write: "workspace" } });
// Agent role: reproduce and fix the bug using the provided specialists when helpful.
const issueReproducer = agent({
  name: "issueReproducer",
  model: "typecheck",
  instructions: p`Reproduce the failing test from ${p.result("npm test")} and use the specialists when helpful.`,
  output: s.object({ diagnosis: Diagnosis, fixSummary: s.string, approved: s.boolean }),
  agents: { diagnose, fix },
  permissions: { shell: "ask", write: "workspace" },
});
export default issueReproducer;
