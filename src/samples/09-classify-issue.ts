import { agent, s } from "rig";

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

const result = await classifyIssue({
  title: "Crash on start",
  body: "segfault",
});

console.log(result.label, result.confidence);
