import { agent, s } from "rig";
import { p } from "rig";
const patcher = agent({
    name: "patcher",
    input: s.object({
        diagnosis: s.string,
        file: s.string,
        contents: s.string
    }),
    output: s.object({
        path: s.string,
        contents: s.string,
        summary: s.string
    }),
    instructions: `Return a complete replacement for the target file.`,
    permissions: { write: "workspace" },
});
const patch = await patcher({
    diagnosis: "The parser accepts trailing prose after JSON.",
    file: "src/index.ts",
    contents: p.bash("cat src/index.ts"),
});
console.log(patch);

export default patcher;
