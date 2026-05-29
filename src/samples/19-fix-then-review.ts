import { agent, sh } from "rig";

const patcher = agent("patcher", {
  input: {
    diagnosis: "Bug diagnosis",
    file: "target file",
    contents: "current file contents",
  },
  output: {
    path: "src/index.ts",
    contents: "replacement file contents",
    summary: "Patch summary",
  },
  instructions: `Return a complete replacement for the target file.`,
  permissions: { write: "workspace" },
});

const patch = await patcher({
  diagnosis: "The parser accepts trailing prose after JSON.",
  file: "src/index.ts",
  contents: sh.text("cat src/index.ts"),
});

console.log(patch);
