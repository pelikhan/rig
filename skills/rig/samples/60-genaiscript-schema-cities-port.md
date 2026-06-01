# 60 - GenAIScript Schema Cities Port

```rig
import { agent } from "rig";
// Agent role: invent five city records that match a strict schema.
const schemaCitiesPort = agent({
  name: "schemaCitiesPort",
  model: "mini",
  instructions: "Give 5 cities with their populations and Wikipedia URLs. Return only valid output.",
  output: {
    type: "array",
    items: {
      type: "object",
      properties: {
        name: { type: "string" },
        population: { type: "number" },
        url: { type: "string" },
      },
      required: ["name", "population", "url"],
    },
  },
});
export default schemaCitiesPort;
```
