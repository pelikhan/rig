# 12 - Security Scan Review

```rig
import { agent, p, s } from "rig";
// Agent role: write release notes from commits. Omit empty sections as empty arrays.
const releaseNotes = agent({
    name: "releaseNotes",
    model: "mini",
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
await releaseNotes({
    commits: p.bash("git log --oneline --decorate -50"),
});

export default releaseNotes;
```
