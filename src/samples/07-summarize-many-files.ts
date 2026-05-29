import { agent, sh } from "rig";

const listFiles = agent("listFiles", {
  output: {
    files: ["src/index.ts"],
  },
  instructions: `
    Parse input.text as shell output.
    Return only source file paths.
  `,
});

const { files } = await listFiles({
  text: sh.text("find src -name '*.ts' -type f | sort"),
});

console.log(files);
