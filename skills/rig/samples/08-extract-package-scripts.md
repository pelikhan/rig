# 08 - Extract Package Scripts

```rig
import { agent, p, s } from "rig";
// Agent role: extract package scripts and summarize what they do.
const extractScripts = agent({
  name: "extractScripts",
  model: "mini",
  instructions: p`Read ${p.read("package.json")} and summarize the package scripts.`,
  output: s.object({ scriptsByName: s.record(s.string), summary: s.string }),
});
export default extractScripts;
```
