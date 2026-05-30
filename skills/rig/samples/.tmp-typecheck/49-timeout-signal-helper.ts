import { agent, s } from "rig";
// Agent role: return a short response before the timeout expires.
const worker = agent({
  name: "worker",
  model: "typecheck",
  instructions: "Return a short response in output.text before the timeout expires.",
  output: s.object({ text: s.string }),
  timeout: 5_000,
});
export default worker;
