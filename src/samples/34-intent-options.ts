import { agent, sh } from "rig";

const investigator = agent("investigator", {
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
  tree: sh.text("find . -maxdepth 3 -type f | sort"),
  packageJson: sh.text("cat package.json"),
  tests: sh.text("find . -name '*test*' -o -name '*spec*'"),
}));
