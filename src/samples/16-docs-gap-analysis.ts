import { agent, s } from "rig";
import { p } from "rig";
const apiDiff = agent({
    name: "apiDiff",
    input: s.object({
        before: s.string,
        after: s.string
    }),
    output: s.object({
        breaking: s.boolean,
        summary: s.string,
        changes: s.array(s.string)
    }),
    instructions: `Compare public API declarations and identify breaking changes.`,
});
console.log(await apiDiff({
    before: p.bash("git show origin/main:dist/index.d.ts"),
    after: p.bash("cat dist/index.d.ts"),
}));
