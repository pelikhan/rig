import { agent, p, s } from "rig";
// Agent role: normalize the config into a JSON-compatible object.
const normalize = agent({
    name: "normalizeConfig",
    model: "mini",
    input: {
        config: String
    },
    output: {
        normalized: s.unknown,
        warnings: [String]
    },
    instructions: `Normalize the config into a JSON-compatible object.`,
});
await normalize({
    config: p.bash("cat config.json 2>/dev/null || cat config.js"),
});

export default normalize;
