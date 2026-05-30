import { agent, s } from "rig";
import { p } from "rig";
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
console.log(await extractJson({
    text: p.text("node ./scripts/print-config.js"),
}));
