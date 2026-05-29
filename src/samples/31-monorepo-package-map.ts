import { agent } from "rig";
import { sh } from "rig/sh";

const actionReview = agent({
  name: "actionReview",
  input: { workflow: "GitHub Actions YAML" },
  output: {
    summary: "Review summary",
    problems: ["problem"],
    improvements: ["improvement"],
  },
  instructions: `Review the workflow for reliability, caching, and least privilege.`,
});

console.log(await actionReview({
  workflow: sh.text("cat .github/workflows/*.yml .github/workflows/*.yaml 2>/dev/null || true"),
}));
