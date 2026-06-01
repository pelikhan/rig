# 56 - GenAIScript Refactor Batch Port

```rig
import { agent, p } from "rig";
// Agent role: suggest metadata refactors for the first three sample files.
const refactorOne = agent({ name: "refactorOne", model: "mini", instructions: "Suggest one minimal metadata cleanup for a rig sample.", output: { type: "object", properties: { file: { type: "string" }, change: { type: "string" } }, required: ["file", "change"] } });
const refactorBatch = agent({
  name: "refactorBatch",
  model: "mini",
  instructions: p`Inspect ${p.bash("find skills/rig/samples -maxdepth 1 -name '*.md' | sort | head -n 3")}. Use refactorOne when helpful and return only the smallest safe cleanup suggestions.`,
  output: {
    type: "object",
    properties: {
      suggestions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            file: { type: "string" },
            change: { type: "string" },
          },
          required: ["file", "change"],
        },
      },
    },
    required: ["suggestions"],
  },
  agents: { refactorOne },
});
export default refactorBatch;
```
