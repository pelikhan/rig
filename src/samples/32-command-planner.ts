import { agent } from "rig";
import { sh } from "rig/sh";

const packageMap = agent({
  name: "packageMap",
  input: { manifests: "package manifest paths and contents" },
  output: {
    packages: [{ name: "package", path: "packages/name", private: true }],
    relationships: [{ from: "a", to: "b", kind: "depends-on" }],
  },
  instructions: `Build a package map for a JavaScript monorepo.`,
});

console.log(await packageMap({
  manifests: sh.text("find . -name package.json -maxdepth 4 -print -exec cat {} \\\;"),
}));
