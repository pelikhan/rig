import { agent } from "rig";

const improve = agent("improveError", {
  input: { message: "raw error", context_: "context" },
  output: {
    message: "improved error",
    explanation: "developer-facing explanation",
  },
  instructions: `Rewrite the error to be actionable and precise.`,
});

console.log(await improve({
  message: "bad output",
  context: "Validation failed for optional underscore field.",
}));
