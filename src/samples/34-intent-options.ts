import { agent, s, p } from "rig";

// Investigates a project using only readonly evidence (file tree, package.json,
// test files) to surface observations and likely entry points.
const investigator = agent({
    name: "investigator",
    input: s.object({
        tree: s.string,
        packageJson: s.string,
        tests: s.string
    }),
    output: s.object({
        observations: s.array(s.string),
        likelyEntryPoints: s.array(s.string)
    }),
    instructions: `Investigate the project using only readonly evidence.`,
    permissions: { shell: "readonly", write: "deny" },
});

export default investigator;
