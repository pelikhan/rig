import { agent, s, p } from "rig";

// Summarizes the current git workspace changes using p.bash shell intents for
// diff and status, demonstrating how shell outputs are inlined into the prompt.
const shellIntents = agent({
  name: "shellIntents",
  instructions: "Summarize the current git workspace changes.",
  input: s.object({
    diff: s.string,
    status: s.string,
  }),
  output: s.object({
    summary: s.string,
    changedFiles: s.array(s.string),
  }),
});

export default shellIntents;
