import { agent, s } from "rig";
// Agent role: write a single haiku about the user's topic.
const haiku = agent({
  name: "single-agent-haiku",
  model: "mini",
  output: s.object({
    haiku: s.string,
  }),
  instructions: `
    Write one haiku about the user's topic.
    Return exactly three short lines in the haiku field.
  `,
});

export default haiku;
