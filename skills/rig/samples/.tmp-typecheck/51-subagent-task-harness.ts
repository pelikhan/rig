import { agent, p, s } from "rig";
// Agent role: draft a runnable rig markdown snippet for the requested task.
const draftRigMarkdown = agent({
  name: "draftRigMarkdown",
  model: "typecheck",
  input: s.object({ task: s.string }),
  output: s.object({ markdown: s.string }),
  instructions: "Return exactly one markdown response with one ```rig fenced block.",
});
// Agent role: validate generated rig code by running TypeScript in no-emit mode.
const typecheckRigProgram = agent({
  name: "typecheckRigProgram",
  model: "typecheck",
  output: s.object({ ok: s.boolean, diagnostics: s.string }),
  instructions: p`Run ${p.result("npx tsc --noEmit --pretty false")} and summarize whether typecheck passed.`,
});
// Agent role: solve the task by delegating to subagents and returning markdown.
const solveTask = agent({
  name: "solveTask",
  model: "typecheck",
  output: s.object({ markdown: s.string }),
  agents: { draftRigMarkdown, typecheckRigProgram },
  instructions: "Use the drafting subagent, validate with typecheck, then return one runnable rig markdown snippet.",
});
export default solveTask;
