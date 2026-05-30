import { agent, s } from "rig";

const designReview = agent({
  name: "designReview",
  input: { proposal: "design proposal" },
  output: {
    decision: s.enum("approve", "revise", "reject"),
    strengths: ["strength"],
    concerns: ["concern"],
    requiredChanges: ["change"],
  },
  instructions: `Review the design proposal for simplicity and maintainability.`,
});

console.log(await designReview({
  proposal: "Add a direct p.run helper for local execution.",
}));
