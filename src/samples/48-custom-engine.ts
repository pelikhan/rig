import { agent, s } from "rig";

// Agent role: review the provided input and return the declared output.

const review = agent({
  name: "review",
  model: "mini",
  input: s.string,
  output: s.object({
    summary: s.string,
    risk: s.enum("low", "medium", "high"),
  }),
});

await review("...");

export default review;
