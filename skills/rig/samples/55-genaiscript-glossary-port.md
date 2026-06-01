# 55 - GenAIScript Glossary Port

```rig
import { agent, p } from "rig";
// Agent role: extract advanced rig glossary terms from docs.
const glossaryPort = agent({
  name: "glossaryPort",
  model: "mini",
  instructions: p`Read ${p.read("README.md")} and ${p.read("skills/rig/SKILL.md")}. Return only advanced rig terms with short definitions and skip duplicates.`,
  output: {
    type: "object",
    properties: {
      terms: {
        type: "array",
        items: {
          type: "object",
          properties: {
            term: { type: "string" },
            definition: { type: "string" },
          },
          required: ["term", "definition"],
        },
      },
    },
    required: ["terms"],
  },
});
export default glossaryPort;
```
