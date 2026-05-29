import { agent, sh } from "rig";

const readmeWriter = agent("readmeWriter", {
  input: {
    packageJson: "package.json contents",
    files: "file list",
  },
  output: {
    path: agent.literal("README.md"),
    contents: "Markdown README contents",
  },
  instructions: `
    Generate a concise README for the package.
    Include install, usage, and API sections.
  `,
});

const { path, contents } = await readmeWriter({
  packageJson: sh.text("cat package.json"),
  files: sh.text("find . -maxdepth 2 -type f | sort"),
});

console.log(path, contents);
