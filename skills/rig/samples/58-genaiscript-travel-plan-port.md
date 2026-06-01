# 58 - GenAIScript Travel Plan Port

```rig
import { agent } from "rig";
// Agent role: merge local advice and language tips into one travel plan.
const localGuide = agent({ name: "localGuide", model: "mini", instructions: "Suggest authentic places and activities for a 3-day trip to Egypt.", output: { type: "object", properties: { ideas: { type: "array", items: { type: "string" } } }, required: ["ideas"] } });
const languageTips = agent({ name: "languageTips", model: "mini", instructions: "Suggest communication tips for a 3-day trip to Egypt.", output: { type: "object", properties: { tips: { type: "array", items: { type: "string" } } }, required: ["tips"] } });
const travelPlanPort = agent({
  name: "travelPlanPort",
  model: "mini",
  instructions: "Plan a 3-day trip to Egypt. Use localGuide and languageTips when helpful, then return one integrated itinerary.",
  output: {
    type: "object",
    properties: {
      itinerary: { type: "array", items: { type: "string" } },
      tips: { type: "array", items: { type: "string" } },
    },
    required: ["itinerary", "tips"],
  },
  agents: { localGuide, languageTips },
});
export default travelPlanPort;
```
