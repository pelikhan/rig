import { agent, s, p } from "rig";

// Parses environment outputs (node version and directory listing) into structured
// fields, demonstrating p.bash intent options such as cwd, timeout, and env.
const envReader = agent({
    name: "envReader",
    input: s.object({
        nodeVersion: s.string,
        cwdFiles: s.string
    }),
    output: s.object({
        nodeMajor: s.number,
        files: s.array(s.string)
    }),
    instructions: `Parse environment outputs.`,
});

export default envReader;
