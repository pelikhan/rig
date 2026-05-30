import { agent, s } from "rig";

const root = agent({
  name: "launcher-stdin-root",
  input: s.object({ text: s.string }),
  output: s.object({ text: s.string }),
});

export default root;
