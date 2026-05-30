import { agent, s } from "rig";

export const root = agent({
  name: "launcher-stdin-named-root",
  input: s.object({ text: s.string }),
  output: s.object({ text: s.string }),
});
