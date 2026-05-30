import { agent, s } from "rig";
const commandPlanner = agent({
    name: "commandPlanner",
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
console.log(await commandPlanner({
    goal: "Understand why TypeScript declarations changed.",
}));
