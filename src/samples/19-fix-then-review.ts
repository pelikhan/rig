import { agent, s, p } from "rig";

// Produces a complete replacement for a target file based on a diagnosis, along
// with a short summary of what changed and why.
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

export default patcher;
