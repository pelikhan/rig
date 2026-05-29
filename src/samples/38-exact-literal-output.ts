import { agent } from "rig";

const parseEvent = agent("parseEvent", {
  input: { text: "event text" },
  output: {
    title: "Event title",
    deletedAt_: agent.nullable("2026-05-28T00:00:00Z"),
  },
  instructions: `Extract event metadata. Use null when deletedAt is absent.`,
});

console.log(await parseEvent({ text: "Created event: release planning" }));
