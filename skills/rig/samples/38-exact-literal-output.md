# 38 - Exact Literal Output

```rig
import { agent, s } from "rig";
// Agent role: extract event metadata. Use null when deletedAt is absent.
const parseEvent = agent({
    name: "parseEvent",
    model: "mini",
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
```
