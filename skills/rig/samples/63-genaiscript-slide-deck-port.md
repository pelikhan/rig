# 63 - GenAIScript Slide Deck Port

```rig
import { agent, p } from "rig";
// Agent role: turn the README into a short slide deck outline.
const slideDeckPort = agent({
  name: "slideDeckPort",
  model: "mini",
  instructions: p`Read ${p.read("README.md")} and draft a short markdown slide deck outline with terse titles and short bullets.`,
  output: {
    type: "object",
    properties: {
      slides: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            bullets: { type: "array", items: { type: "string" } },
          },
          required: ["title", "bullets"],
        },
      },
    },
    required: ["slides"],
  },
});
export default slideDeckPort;
```
