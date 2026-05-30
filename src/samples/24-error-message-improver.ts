import { agent, s, p } from "rig";

// Infers a practical runtime-visible schema from NDJSON samples, listing fields
// with their types and optionality, plus a representative example object.
const inferShape = agent({
    name: "inferShape",
    input: s.object({
        jsonSamples: s.string
    }),
    output: s.object({
        fields: s.array(s.object({
            name: s.string,
            type: s.string,
            optional: s.boolean
        })),
        example: s.unknown
    }),
    instructions: `Infer a practical runtime-visible schema from the samples.`,
});

export default inferShape;
