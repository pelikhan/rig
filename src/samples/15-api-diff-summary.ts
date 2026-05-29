import { agent } from "rig";

const categorize = agent("categorizeChange", {
  input: { text: "change description" },
  output: {
    category: agent.enum(["added", "changed", "deprecated", "removed", "fixed", "security"]),
    entry: "Changelog entry",
  },
  instructions: `Convert the change description to Keep a Changelog style.`,
});

console.log(await categorize({ text: "Fix crash when config is missing." }));
