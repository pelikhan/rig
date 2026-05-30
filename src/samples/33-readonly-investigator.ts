import { agent, s } from "rig";

// Plans a sequence of shell commands to achieve a goal, preferring readonly
// commands and annotating each with its purpose.
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

export default commandPlanner;
