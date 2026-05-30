# 43 - Snapshot Test Updater

```rig
import { agent, s } from "rig";
// Agent role: repair input.text into a JSON-compatible value.
const repair = agent({
    name: "jsonRepair",
    model: "mini",
    input: s.object({
        text: s.string
    }),
    output: s.object({
        repaired: s.unknown,
        changes: s.array(s.string)
    }),
    instructions: `Repair input.text into a JSON-compatible value.`,
});
await repair({
    text: "{name: 'rig', trailing: true,}",
});

export default repair;
```
