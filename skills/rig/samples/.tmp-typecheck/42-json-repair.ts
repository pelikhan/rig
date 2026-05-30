import { agent, s } from "rig";

// Agent role: summarize the diff.

const summarize = agent({
  name: "summarize",
  model: "typecheck",
  instructions: "Summarize the diff.",
  output: s.object({
    summary: s.string,
  }),
  maxTurns: 2,
  repair: "default",
});

export default summarize;
