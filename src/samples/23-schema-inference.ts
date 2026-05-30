import { agent, s, p } from "rig";

// Normalizes a configuration file (JSON or JS) into a JSON-compatible object,
// returning warnings for any values that could not be safely normalized.
const normalize = agent({
    name: "normalizeConfig",
    input: s.object({
        config: s.string
    }),
    output: s.object({
        normalized: s.unknown,
        warnings: s.array(s.string)
    }),
    instructions: `Normalize the config into a JSON-compatible object.`,
});

export default normalize;
