import { agent, s } from "rig";
import { p } from "rig";

const extractJson = agent({
  name: "extractJson",
  input: { text: "raw command output" },
  output: {
    raw: s.unknown,
    summary: "summary of raw object",
  },
  instructions: `Extract any JSON object from input.text into raw.`,
});

console.log(await extractJson({
  text: p.text("node ./scripts/print-config.js"),
}));
