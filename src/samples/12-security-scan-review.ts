import { agent, s, p } from "rig";

// Generates structured release notes from recent commit history, separating
// highlights, breaking changes, and bug fixes.
const releaseNotes = agent({
    name: "releaseNotes",
    input: s.object({
        commits: s.string
    }),
    output: s.object({
        version: s.optional(s.string),
        highlights: s.array(s.string),
        breaking: s.array(s.string),
        fixes: s.array(s.string)
    }),
    instructions: `Write release notes from commits. Omit empty sections as empty arrays.`,
});

export default releaseNotes;
