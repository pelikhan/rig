import { agent, sh } from "rig";

const writer = agent("writer", {
  input: {
    write: {
      ok: true,
      stdout: "stdout",
      stderr: "stderr",
      exitCode: 0,
    },
  },
  output: {
    written: true,
    summary: "What was written",
  },
  instructions: `
    Confirm whether the write intent succeeded.
  `,
  permissions: {
    write: "workspace",
  },
});

const result = await writer({
  write: sh.write("README.md", "# Project\n\nGenerated README.\n", {
    purpose: "create project README",
  }),
});

console.log(result);
