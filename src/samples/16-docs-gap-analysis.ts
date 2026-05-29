import { agent } from "rig";
import { sh } from "rig/sh";

const apiDiff = agent({
  name: "apiDiff",
  input: {
    before: "old declarations",
    after: "new declarations",
  },
  output: {
    breaking: true,
    summary: "API diff summary",
    changes: ["Specific API change"],
  },
  instructions: `Compare public API declarations and identify breaking changes.`,
});

console.log(await apiDiff({
  before: sh.text("git show origin/main:dist/index.d.ts"),
  after: sh.text("cat dist/index.d.ts"),
}));
