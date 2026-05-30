import { agent, s, p } from "rig";

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

const result = await shellIntents({
  diff: p.bash("git diff -- ."),
  status: p.bash("git status --short"),
});

console.log(JSON.stringify(result, null, 2));

export default shellIntents;
