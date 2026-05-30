import { agent, s } from "rig";
import { p } from "rig";
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
console.log(await investigator({
    tree: p.bash("find . -maxdepth 3 -type f | sort"),
    packageJson: p.bash("cat package.json"),
    tests: p.bash("find . -name '*test*' -o -name '*spec*'"),
}));
