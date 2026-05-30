import { agent, s, p } from "rig";

// Confirms whether a file-write intent succeeded by inspecting the write result,
// returning a boolean and a brief summary.
const writer = agent({
    name: "writer",
    input: s.object({
        write: s.object({
            ok: s.boolean,
            stdout: s.string,
            stderr: s.string,
            exitCode: s.number
        })
    }),
    output: s.object({
        written: s.boolean,
        summary: s.string
    }),
    instructions: `
    Confirm whether the write intent succeeded.
  `,
    permissions: {
        write: "workspace",
    },
});

export default writer;
