import { agent } from "rig";
import { p } from "rig";

const envReader = agent({
  name: "envReader",
  input: { nodeVersion: "node version", cwdFiles: "file list" },
  output: {
    nodeMajor: 24,
    files: ["file"],
  },
  instructions: `Parse environment outputs.`,
});

console.log(await envReader({
  nodeVersion: p.text("node --version", {
    cwd: ".",
    timeout: 10_000,
    purpose: "check Node version",
  }),
  cwdFiles: p.text("ls -la", {
    env: { FORCE_COLOR: "0" },
    purpose: "list current directory",
  }),
}));
