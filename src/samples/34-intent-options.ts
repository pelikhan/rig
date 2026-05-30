import { agent } from "rig";
import { p } from "rig";

const investigator = agent({
  name: "investigator",
  input: {
    tree: "repo tree",
    packageJson: "package.json",
    tests: "test list",
  },
  output: {
    observations: ["observation"],
    likelyEntryPoints: ["file"],
  },
  instructions: `Investigate the project using only readonly evidence.`,
  permissions: { shell: "readonly", write: "deny" },
});

console.log(await investigator({
  tree: p.text("find . -maxdepth 3 -type f | sort"),
  packageJson: p.text("cat package.json"),
  tests: p.text("find . -name '*test*' -o -name '*spec*'"),
}));
