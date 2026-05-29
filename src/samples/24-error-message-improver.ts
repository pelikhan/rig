import { agent, s } from "rig";
import { sh } from "rig/sh";

const inferShape = agent({
  name: "inferShape",
  input: { jsonSamples: "newline-delimited JSON samples" },
  output: {
    fields: [{ name: "field", type: "string", optional: true }],
    example: s.unknown,
  },
  instructions: `Infer a practical runtime-visible schema from the samples.`,
});

console.log(await inferShape({
  jsonSamples: sh.text("head -100 data/events.ndjson"),
}));
