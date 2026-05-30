import { agent, s } from "rig";

// Rewrites a vague or unhelpful error message to be actionable and precise,
// and provides a plain-language explanation of the underlying problem.
const improve = agent({
    name: "improveError",
    input: s.object({
        message: s.string,
        context: s.optional(s.string)
    }),
    output: s.object({
        message: s.string,
        explanation: s.string
    }),
    instructions: `Rewrite the error to be actionable and precise.`,
});

export default improve;
