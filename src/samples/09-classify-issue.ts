import { agent, sh } from "rig";

const scripts = agent("scripts", {
  input: { packageJson: "package.json contents" },
  output: {
    scripts: {
      "*": "npm script command",
    },
  },
  instructions: `Extract package.json scripts into output.scripts.`,
});

const result = await scripts({
  packageJson: sh.text("cat package.json"),
});

console.log(result.scripts);
