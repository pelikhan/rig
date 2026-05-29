import { agent } from "rig";

const designReview = agent("designReview", {
  input: { proposal: "design proposal" },
  output: {
    decision: agent.enum(["approve", "revise", "reject"]),
    strengths: ["strength"],
    concerns: ["concern"],
    requiredChanges: ["change"],
  },
  instructions: `Review the design proposal for simplicity and maintainability.`,
});

console.log(await designReview({
  proposal: "Add a direct sh.run helper for local execution.",
}));
