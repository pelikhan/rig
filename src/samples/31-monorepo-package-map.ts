import { agent, s, p } from "rig";

// Reviews GitHub Actions workflow files for reliability, caching, and least-privilege
// issues, returning a summary with problems and suggested improvements.
const actionReview = agent({
    name: "actionReview",
    input: s.object({
        workflow: s.string
    }),
    output: s.object({
        summary: s.string,
        problems: s.array(s.string),
        improvements: s.array(s.string)
    }),
    instructions: `Review the workflow for reliability, caching, and least privilege.`,
});

export default actionReview;
