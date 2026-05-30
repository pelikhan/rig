import { agent, s } from "rig";

// Reviews a code diff and returns a risk rating alongside a summary, demonstrating
// how to wire a custom engine by importing copilotEngine separately.
const review = agent({
  name: "review",
  input: s.object({ diff: s.string }),
  output: s.object({
    summary: s.string,
    risk: s.enum("low", "medium", "high"),
  }),
});

export default review;
