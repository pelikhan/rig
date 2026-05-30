# 04 - Generate Readme

```rig
import { agent, s } from "rig";
import { p } from "rig";
const ShResult = s.object({
    ok: s.boolean,
    stdout: s.string,
    stderr: s.string,
    exitCode: s.number
});
const diagnose = agent({
    name: "diagnose",
    input: s.object({
        test: ShResult
    }),
    output: s.object({
        rootCause: s.string,
        confidence: s.number,
        relevantFiles: s.array(s.string),
        nextSteps: s.array(s.string)
    }),
    instructions: `
    Diagnose the failing test result.
    Do not edit files.
  `,
});
const result = await diagnose({
    test: p.result("npm test"),
});
console.log(result);

export default diagnose;
```
