# 36 - Subagent Delegation

```rig
import { agent, s } from "rig";

// Agent role: extract the most important implementation details from the topic.

const researcher = agent({
  name: "researcher",
  model: "mini",
  instructions: "Extract the most important implementation details from the topic.",
  output: s.object({
    summary: s.string,
    risks: s.array(s.string),
  }),
});

// Agent role: turn the research summary into concrete next steps for the caller.

const planner = agent({
  name: "planner",
  model: "mini",
  instructions: "Turn the research summary into concrete next steps for the caller.",
  input: s.object({
    summary: s.string,
    risks: s.array(s.string),
  }),
  output: s.object({
    decision: s.string,
    nextSteps: s.array(s.string),
  }),
});

export default researcher;
```
