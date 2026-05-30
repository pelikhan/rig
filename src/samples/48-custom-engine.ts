import { agent, s } from "rig";

const review = agent({
  name: "review",
  input: s.object({ diff: s.string }),
  output: s.object({
    summary: s.string,
    risk: s.enum("low", "medium", "high"),
  }),
});

const result = await review({ diff: "..." });
console.log(result);

export default review;
