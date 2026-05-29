import { agent } from "rig";

const repair = agent("jsonRepair", {
  input: { text: "possibly invalid JSON" },
  output: {
    repaired: agent.unknown(),
    changes: ["repair description"],
  },
  instructions: `Repair input.text into a JSON-compatible value.`,
});

console.log(await repair({
  text: "{name: 'rig', trailing: true,}",
}));
