import { agent, s, p } from "rig";

// Flags unknown or legally concerning dependency licenses from the full npm tree,
// returning a compliance verdict with per-package details.
const licenseCheck = agent({
    name: "licenseCheck",
    input: s.object({
        packages: s.string
    }),
    output: s.object({
        compliant: s.boolean,
        unknown: s.array(s.string),
        concerning: s.array(s.object({
            package: s.string,
            license: s.string,
            reason: s.string
        }))
    }),
    instructions: `Flag unknown or concerning dependency licenses.`,
});

export default licenseCheck;
