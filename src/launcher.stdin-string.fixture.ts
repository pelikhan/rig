import { agent, s } from "rig";

const root = agent({
  name: "launcher-stdin-string-root",
  input: s.string,
  output: s.string,
});

export default root;
