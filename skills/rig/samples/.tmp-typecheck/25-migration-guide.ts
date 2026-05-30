import { agent, s } from "rig";
// Agent role: rewrite the error to be actionable and precise.
const improve = agent({
    name: "improveError",
    model: "typecheck",
    output: s.object({
        message: s.string,
        explanation: s.string
    }),
    instructions: `Rewrite the error to be actionable and precise.`,
});

export default improve;
