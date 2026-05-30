import { agent, s } from "rig";
import { p } from "rig";
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
const result = await writer({
    write: p.write("README.md", "# Project\n\nGenerated README.\n", {
        purpose: "create project README",
    }),
});
console.log(result);
