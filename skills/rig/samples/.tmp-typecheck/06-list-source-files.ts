import { agent, p, s } from "rig";
// Agent role: confirm whether the write intent succeeded.
const writer = agent({
    name: "writer",
    model: "typecheck",
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
