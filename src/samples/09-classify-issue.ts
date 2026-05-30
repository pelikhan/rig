import { agent, s } from "rig";

// Classifies a GitHub issue into a category (bug, feature, question, or docs)
// and returns a confidence level for the classification.
const classifyIssue = agent({
  name: "classifyIssue",
  instructions: "Classify the issue.",
  input: s.object({
    title: s.string,
    body: s.string,
  }),
  output: s.object({
    label: s.enum("bug", "feature", "question", "docs"),
    confidence: s.enum("low", "medium", "high"),
  }),
});

export default classifyIssue;
