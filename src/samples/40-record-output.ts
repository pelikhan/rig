import { agent, p, s } from "rig";
// Agent role: extract any JSON object from input.text into raw.
const extractJson = agent({
    name: "extractJson",
    model: "mini",
    input: s.object({
        text: s.string
    }),
    output: s.object({
        raw: s.unknown,
        summary: s.string
    }),
    instructions: `Extract any JSON object from input.text into raw.`,
});
await extractJson({
    text: p.bash("node ./scripts/print-config.js"),
});

export default extractJson;
