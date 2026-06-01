# 57 - GenAIScript Issue Review Port

```rig
import { agent } from "rig";
// Agent role: review a GitHub issue report and return concise feedback.
const issueReviewPort = agent({
  name: "issueReviewPort",
  model: "mini",
  instructions: "Review this issue draft: \"The CLI crashes sometimes when reading stdin programs on Windows. I expected it to work.\" Ask only for missing reproduction details and missing expected behavior.",
  output: {
    type: "object",
    properties: {
      summary: { type: "string" },
      questions: { type: "array", items: { type: "string" } },
    },
    required: ["summary", "questions"],
  },
});
export default issueReviewPort;
```
