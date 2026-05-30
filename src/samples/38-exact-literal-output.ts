import { agent, s } from "rig";

// Extracts event metadata from freeform text; uses null (not undefined) for
// absent optional fields like deletedAt, demonstrating nullable output schemas.
const parseEvent = agent({
    name: "parseEvent",
    input: s.object({
        text: s.string
    }),
    output: s.object({
        title: s.string,
        deletedAt: s.optional(s.nullable(s.string))
    }),
    instructions: `Extract event metadata. Use null when deletedAt is absent.`,
});

export default parseEvent;
