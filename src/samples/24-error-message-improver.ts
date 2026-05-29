import { agent, sh } from "rig";

const inferShape = agent("inferShape", {
  input: { jsonSamples: "newline-delimited JSON samples" },
  output: {
    fields: [{ name: "field", type: "string", optional: true }],
    example: agent.unknown(),
  },
  instructions: `Infer a practical runtime-visible schema from the samples.`,
});

console.log(await inferShape({
  jsonSamples: sh.text("head -100 data/events.ndjson"),
}));
