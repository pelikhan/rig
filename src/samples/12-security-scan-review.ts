import { agent } from "rig";
import { p } from "rig";

const releaseNotes = agent({
  name: "releaseNotes",
  input: { commits: "git log output" },
  output: {
    version_: "1.2.3",
    highlights: ["User-facing change"],
    breaking: ["Breaking change"],
    fixes: ["Bug fix"],
  },
  instructions: `Write release notes from commits. Omit empty sections as empty arrays.`,
});

console.log(await releaseNotes({
  commits: p.text("git log --oneline --decorate -50"),
}));
