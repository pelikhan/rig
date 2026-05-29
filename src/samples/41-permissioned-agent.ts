import { agent } from "rig";
import { sh } from "rig/sh";

const coverage = agent({
  name: "coverage",
  input: { report: "coverage report" },
  output: {
    files: {
      "*": {
        lines: 95,
        branches: 80,
        notes_: "coverage note",
      },
    },
  },
  instructions: `Parse coverage by file path.`,
});

console.log(await coverage({
  report: sh.text("cat coverage/coverage-summary.json"),
}));
