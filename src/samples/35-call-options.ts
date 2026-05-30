import { agent, s } from "rig";
import { p } from "rig";
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
console.log(await envReader({
    nodeVersion: p.bash("node --version", {
        cwd: ".",
        timeout: 10000,
        purpose: "check Node version",
    }),
    cwdFiles: p.bash("ls -la", {
        env: { FORCE_COLOR: "0" },
        purpose: "list current directory",
    }),
}));
