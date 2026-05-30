import { agent, s } from "rig";

// Authors a concise migration guide between two package versions, with ordered
// steps and before/after code examples for each breaking change.
const migration = agent({
    name: "migrationGuide",
    input: s.object({
        fromVersion: s.string,
        toVersion: s.string,
        changes: s.array(s.string)
    }),
    output: s.object({
        title: s.string,
        steps: s.array(s.string),
        examples: s.array(s.object({
            before: s.string,
            after: s.string
        }))
    }),
    instructions: `Write a concise migration guide.`,
});

export default migration;
