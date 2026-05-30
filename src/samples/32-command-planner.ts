import { agent } from "rig";
import { p } from "rig";

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
  manifests: p.text("find . -name package.json -maxdepth 4 -print -exec cat {} \\\;"),
}));
