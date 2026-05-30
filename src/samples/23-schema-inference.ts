import { agent, s } from "rig";
import { p } from "rig";
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
console.log(await normalize({
    config: p.bash("cat config.json 2>/dev/null || cat config.js"),
}));
