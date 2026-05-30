import { agent, s } from "rig";
// Agent role: write an initial response to the user request.
const writer = agent({
  name: "writer",
  model: "typecheck",
  input: s.string,
  output: s.object({ draft: s.string }),
  instructions: "Write a helpful, clear response to the request.",
});
// Agent role: critique the draft against helpfulness, harmlessness, and honesty principles.
const critic = agent({
  name: "critic",
  model: "typecheck",
  input: s.object({ request: s.string, draft: s.string }),
  output: s.object({ issues: s.array(s.string), score: s.number, acceptable: s.boolean }),
  instructions: "Evaluate the draft against helpfulness, harmlessness, and honesty principles.",
});
// Agent role: revise the draft to address all issues identified by the critic.
const reviser = agent({
  name: "reviser",
  model: "typecheck",
  input: s.object({ request: s.string, draft: s.string, issues: s.array(s.string) }),
  output: s.object({ response: s.string }),
  instructions: "Revise the draft to address all issues identified by the critic.",
});
export default reviser;
