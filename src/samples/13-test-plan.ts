import { agent, s } from "rig";
import { p } from "rig";

const securityReview = agent({
  name: "securityReview",
  input: {
    dependencies: "dependency list",
    audit: "npm audit output",
  },
  output: {
    status: s.enum("clean", "needs-action", "unknown"),
    findings: [{ package: "name", severity: "severity", action: "recommended action" }],
  },
  instructions: `Review dependency security posture from the provided outputs.`,
});

console.log(await securityReview({
  dependencies: p.text("npm ls --depth=0"),
  audit: p.text("npm audit --json", { purpose: "security audit" }),
}));
