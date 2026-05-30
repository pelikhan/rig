# 05 - Write Readme Intent

```rig
import { agent, p, s } from "rig";
// Agent role: generate a concise README for the package. Include install, usage, and API sections.
const readmeWriter = agent({
    name: "readmeWriter",
    model: "mini",
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
    packageJson: p.bash("cat package.json"),
    files: p.bash("find . -maxdepth 2 -type f | sort"),
});

export default readmeWriter;
```
