import { agent } from "rig";

const migration = agent({
  name: "migrationGuide",
  input: {
    fromVersion: "1.0.0",
    toVersion: "2.0.0",
    changes: ["change"],
  },
  output: {
    title: "Migration guide title",
    steps: ["Migration step"],
    examples: [{ before: "old code", after: "new code" }],
  },
  instructions: `Write a concise migration guide.`,
});

console.log(await migration({
  fromVersion: "0.1",
  toVersion: "0.2",
  changes: ["Agents now always receive input objects."],
}));
