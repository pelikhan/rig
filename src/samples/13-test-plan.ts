import { agent, s, p } from "rig";

// Reviews the project's dependency security posture using npm ls and audit output,
// returning a clean/needs-action status with per-package findings.
const securityReview = agent({
    name: "securityReview",
    input: s.object({
        dependencies: s.string,
        audit: s.string
    }),
    output: s.object({
        status: s.enum("clean", "needs-action", "unknown"),
        findings: s.array(s.object({
            package: s.string,
            severity: s.string,
            action: s.string
        }))
    }),
    instructions: `Review dependency security posture from the provided outputs.`,
});

export default securityReview;
