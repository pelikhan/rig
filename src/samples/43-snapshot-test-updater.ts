import { agent, s } from "rig";

// Repairs a syntactically invalid JSON-like string into a valid JSON-compatible
// value, listing each transformation applied.
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

export default repair;
