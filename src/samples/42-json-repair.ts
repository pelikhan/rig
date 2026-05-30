import { agent, s } from "rig";

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

console.log(await summarize({ diff: "diff --git a/file.ts b/file.ts" }));

export default summarize;
