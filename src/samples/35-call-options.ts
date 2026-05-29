import { agent } from "rig";
import { sh } from "rig";

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
  nodeVersion: sh.text("node --version", {
    cwd: ".",
    timeout: 10_000,
    purpose: "check Node version",
  }),
  cwdFiles: sh.text("ls -la", {
    env: { FORCE_COLOR: "0" },
    purpose: "list current directory",
  }),
}));
