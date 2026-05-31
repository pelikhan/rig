# 49 - Timeout Signal Helper

```rig
import { agent, s } from "rig";
import { timeout } from "rig/addons";
// Agent role: return a short response before the timeout expires.
const worker = agent({
  name: "worker",
  model: "mini",
  instructions: "Return a short response before the timeout expires.",
  addon: timeout({ timeout: 5_000 }),
});
export default worker;
```
