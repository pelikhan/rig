# 61 - GenAIScript List Files Port

```rig
import { agent, p } from "rig";
// Agent role: pick the most interesting rig sample files.
const listFilesPort = agent({
  name: "listFilesPort",
  model: "nano",
  instructions: p`Review ${p.bash("find skills/rig/samples -maxdepth 1 -name '*.md' | sort")}. Select the 3 most interesting sample files.`,
  output: {
    type: "object",
    properties: {
      files: { type: "array", items: { type: "string" } },
    },
    required: ["files"],
  },
});
export default listFilesPort;
```
