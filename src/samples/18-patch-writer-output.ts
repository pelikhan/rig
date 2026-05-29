import { agent } from "rig";
import { sh } from "rig";

const refactorPlan = agent({
  name: "refactorPlan",
  input: { files: "file list", target: "refactor goal" },
  output: {
    steps: ["Ordered refactor step"],
    files: ["src/index.ts"],
    risks: ["Risk"],
  },
  instructions: `Plan a minimal, low-risk refactor. Do not edit files.`,
});

console.log(await refactorPlan({
  files: sh.text("find src -type f | sort"),
  target: "Split validation helpers out of the main runtime file.",
}));
