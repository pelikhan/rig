import { agent, sh } from "rig";

const licenseCheck = agent("licenseCheck", {
  input: { packages: "dependency license output" },
  output: {
    compliant: true,
    unknown: ["package"],
    concerning: [{ package: "name", license: "license", reason: "reason" }],
  },
  instructions: `Flag unknown or concerning dependency licenses.`,
});

console.log(await licenseCheck({
  packages: sh.text("npm ls --json --all", { purpose: "collect dependency tree" }),
}));
