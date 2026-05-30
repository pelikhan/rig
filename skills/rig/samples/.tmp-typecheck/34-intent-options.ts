import { agent, p, s } from "rig";
// Agent role: investigate the project using only readonly evidence.
const investigator = agent({
    name: "investigator",
    model: "typecheck",
    output: s.object({
        observations: s.array(s.string),
        likelyEntryPoints: s.array(s.string)
    }),
    instructions: `Investigate the project using only readonly evidence.`,
    permissions: { shell: "readonly", write: "deny" },
});

export default investigator;
