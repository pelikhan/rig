import { agent, s } from "rig";

const categorize = agent({
  name: "categorizeChange",
  input: { text: "change description" },
  output: {
    category: s.enum("added", "changed", "deprecated", "removed", "fixed", "security"),
    entry: "Changelog entry",
  },
  instructions: `Convert the change description to Keep a Changelog style.`,
});

console.log(await categorize({ text: "Fix crash when config is missing." }));
