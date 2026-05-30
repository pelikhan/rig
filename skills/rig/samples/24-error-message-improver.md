# 24 - Error Message Improver

```rig
import { agent, s } from "rig";
import { p } from "rig";
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
console.log(await inferShape({
    jsonSamples: p.bash("head -100 data/events.ndjson"),
}));

export default inferShape;
```
