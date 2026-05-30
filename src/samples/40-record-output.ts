import { agent, s, p } from "rig";

// Extracts any JSON object embedded in arbitrary text into a typed `raw` field,
// demonstrating s.unknown for dynamically-shaped output values.
const extractJson = agent({
    name: "extractJson",
    input: s.object({
        text: s.string
    }),
    output: s.object({
        raw: s.unknown,
        summary: s.string
    }),
    instructions: `Extract any JSON object from input.text into raw.`,
});

export default extractJson;
