# 49 - Timeout Signal Helper

```rig
import { agent } from "rig";

// Agent role: return a short response in output.text.

const worker = agent({
  name: "worker",
  model: "mini",
  instructions: `Return a short response in output.text.`,
});

export default worker;
```
