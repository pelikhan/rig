import { agent } from "rig";

const commandPlanner = agent({
  name: "commandPlanner",
  input: { goal: "developer goal" },
  output: {
    commands: [{ command: "shell command", purpose: "why run it", readonly: true }],
  },
  instructions: `Plan shell commands for the goal. Prefer readonly commands.`,
});

console.log(await commandPlanner({
  goal: "Understand why TypeScript declarations changed.",
}));
