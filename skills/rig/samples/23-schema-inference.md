# 23 - Schema Inference

```rig
import { agent, p, s } from "rig";
// Agent role: normalize the config into a JSON-compatible object.
const normalize = agent({
    name: "normalizeConfig",
    model: "mini",
    input: s.object({
        config: s.string
    }),
    output: s.object({
        normalized: s.unknown,
        warnings: s.array(s.string)
    }),
    instructions: `Normalize the config into a JSON-compatible object.`,
});
await normalize({
    config: p.bash("cat config.json 2>/dev/null || cat config.js"),
});

export default normalize;
```
