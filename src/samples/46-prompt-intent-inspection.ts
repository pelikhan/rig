import { agent } from "rig";
import { p } from "rig";

const owners = agent({
  name: "owners",
  input: {
    codeowners: "CODEOWNERS file",
    changedFiles: "changed files",
  },
  output: {
    owners: ["owner"],
    unmatchedFiles: ["file"],
  },
  instructions: `Suggest owners for changed files.`,
});

console.log(await owners({
  codeowners: p.text("cat CODEOWNERS .github/CODEOWNERS 2>/dev/null || true"),
  changedFiles: p.text("git diff --name-only origin/main...HEAD"),
}));
