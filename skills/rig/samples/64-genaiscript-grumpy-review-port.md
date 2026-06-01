# 64 - GenAIScript Grumpy Review Port

```rig
import { agent, p } from "rig";
// Agent role: review one rig sample in a terse critical voice.
const grumpyReviewPort = agent({
  name: "grumpyReviewPort",
  model: "mini",
  instructions: p`Review ${p.read("skills/rig/samples/36-subagent-delegation.md")} in a terse senior-engineer voice. Be specific, but keep each point short.`,
  output: {
    type: "object",
    properties: {
      findings: { type: "array", items: { type: "string" } },
      verdict: { type: "string" },
    },
    required: ["findings", "verdict"],
  },
});
export default grumpyReviewPort;
```
