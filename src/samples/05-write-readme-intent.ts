import { agent, s, p } from "rig";

// Generates a concise README.md by reading package.json and the project file tree,
// then writing install, usage, and API sections.
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

export default readmeWriter;
