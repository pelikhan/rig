import { agent, s } from "rig";
import { p } from "rig";
const docsGap = agent({
    name: "docsGap",
    input: s.object({
        source: s.string,
        docs: s.string
    }),
    output: s.object({
        missing: s.array(s.string),
        stale: s.array(s.string),
        quickFixes: s.array(s.string)
    }),
    instructions: `Find documentation gaps against the source API.`,
});
console.log(await docsGap({
    source: p.bash("grep -R \"export \" -n src || true"),
    docs: p.bash("cat README.md docs/*.md 2>/dev/null || true"),
}));

export default docsGap;
