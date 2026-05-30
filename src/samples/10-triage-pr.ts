import { agent, s } from "rig";
const classifyIssue = agent({
    name: "classifyIssue",
    input: s.object({
        title: s.string,
        body: s.string
    }),
    output: s.object({
        kind: s.enum("bug", "feature", "question", "chore"),
        priority: s.enum("p0", "p1", "p2", "p3"),
        rationale: s.string,
        labels: s.array(s.string)
    }),
    instructions: `Classify the GitHub issue and suggest labels.`,
});
console.log(await classifyIssue({
    title: "CLI exits zero after failed upload",
    body: "The command prints an error but exits with code 0.",
}));

export default classifyIssue;
