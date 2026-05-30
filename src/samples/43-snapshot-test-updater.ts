import { agent, s } from "rig";
const repair = agent({
    name: "jsonRepair",
    input: s.object({
        text: s.string
    }),
    output: s.object({
        repaired: s.unknown,
        changes: s.array(s.string)
    }),
    instructions: `Repair input.text into a JSON-compatible value.`,
});
console.log(await repair({
    text: "{name: 'rig', trailing: true,}",
}));

export default repair;
