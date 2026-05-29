import { agent, sh } from "rig";

const formatter = agent("formatter", {
  input: { result: { ok: true, stdout: "", stderr: "", exitCode: 0 } },
  output: {
    formatted: true,
    summary: "Formatting summary",
  },
  instructions: `Report whether formatting succeeded.`,
  permissions: {
    shell: "ask",
    write: "workspace",
  },
});

console.log(await formatter({
  result: sh.result("npm run format", { purpose: "format workspace files" }),
}));
