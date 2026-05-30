import { agent, s } from "rig";

// Summarizes a git diff in one sentence, using maxTurns and repair to demonstrate
// how rig limits retries and automatically repairs malformed JSON output.
const summarize = agent({
  name: "summarize",
  instructions: "Summarize the diff.",
  input: s.object({
    diff: s.string,
  }),
  output: s.object({
    summary: s.string,
  }),
  maxTurns: 2,
  repair: "default",
});

export default summarize;
