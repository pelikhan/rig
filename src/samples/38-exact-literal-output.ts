import { agent, s } from "rig";
const parseEvent = agent({
    name: "parseEvent",
    input: s.object({
        text: s.string
    }),
    output: s.object({
        title: s.string,
        deletedAt: s.optional(s.nullable("2026-05-28T00:00:00Z"))
    }),
    instructions: `Extract event metadata. Use null when deletedAt is absent.`,
});
console.log(await parseEvent({ text: "Created event: release planning" }));
