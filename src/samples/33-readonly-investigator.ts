import { agent, s } from "rig";
// Agent role: plan shell commands for the goal. Prefer readonly commands.
const commandPlanner = agent({
    name: "commandPlanner",
    model: "mini",
    input: s.object({
        goal: s.string
    }),
    output: s.object({
        commands: s.array(s.object({
            command: s.string,
            purpose: s.string,
            readonly: s.boolean
        }))
    }),
    instructions: `Plan shell commands for the goal. Prefer readonly commands.`,
});
await commandPlanner({
    goal: "Understand why TypeScript declarations changed.",
});

export default commandPlanner;
