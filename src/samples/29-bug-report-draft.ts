import { agent, s } from "rig";
import { p } from "rig";
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
console.log(await licenseCheck({
    packages: p.bash("npm ls --json --all", { purpose: "collect dependency tree" }),
}));

export default licenseCheck;
