# 62 - GenAIScript TODO Port

```rig
import { agent, p } from "rig";
// Agent role: propose minimal TODO implementations from the current workspace.
const todoPort = agent({
  name: "todoPort",
  model: "mini",
  instructions: p`Check ${p.bash("rg -n 'TODO' src skills scripts . || true")}. For up to one actionable TODO, return the target file and the minimal implementation plan.`,
  output: {
    type: "object",
    properties: {
      todos: {
        type: "array",
        items: {
          type: "object",
          properties: {
            file: { type: "string" },
            plan: { type: "string" },
          },
          required: ["file", "plan"],
        },
      },
    },
    required: ["todos"],
  },
});
export default todoPort;
```
