import { agent } from "rig";
import { p } from "rig";

const licenseCheck = agent({
  name: "licenseCheck",
  input: { packages: "dependency license output" },
  output: {
    compliant: true,
    unknown: ["package"],
    concerning: [{ package: "name", license: "license", reason: "reason" }],
  },
  instructions: `Flag unknown or concerning dependency licenses.`,
});

console.log(await licenseCheck({
  packages: p.text("npm ls --json --all", { purpose: "collect dependency tree" }),
}));
