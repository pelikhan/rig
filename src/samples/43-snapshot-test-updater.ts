import { agent, s } from "rig";

const repair = agent({
  name: "jsonRepair",
  input: { text: "possibly invalid JSON" },
  output: {
    repaired: s.unknown,
    changes: ["repair description"],
  },
  instructions: `Repair input.text into a JSON-compatible value.`,
});

console.log(await repair({
  text: "{name: 'rig', trailing: true,}",
}));
