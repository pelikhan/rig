import { agent, s } from "rig";
import { p } from "rig";
const readmeWriter = agent({
    name: "readmeWriter",
    input: s.object({
        packageJson: s.string,
        files: s.string
    }),
    output: s.object({
        path: s.literal("README.md"),
        contents: s.string
    }),
    instructions: `
    Generate a concise README for the package.
    Include install, usage, and API sections.
  `,
});
const { path, contents } = await readmeWriter({
    packageJson: p.text("cat package.json"),
    files: p.text("find . -maxdepth 2 -type f | sort"),
});
console.log(path, contents);
