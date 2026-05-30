import { agent, s } from "rig";
import { p } from "rig";
const owners = agent({
    name: "owners",
    input: s.object({
        codeowners: s.string,
        changedFiles: s.string
    }),
    output: s.object({
        owners: s.array(s.string),
        unmatchedFiles: s.array(s.string)
    }),
    instructions: `Suggest owners for changed files.`,
});
console.log(await owners({
    codeowners: p.text("cat CODEOWNERS .github/CODEOWNERS 2>/dev/null || true"),
    changedFiles: p.text("git diff --name-only origin/main...HEAD"),
}));
