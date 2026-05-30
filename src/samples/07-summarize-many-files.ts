import { agent, s, p } from "rig";

// Summarizes the repository source file list into a single descriptive sentence.
const summarizeFiles = agent({
  name: "summarizeFiles",
  instructions: "Summarize the repository file list in one sentence.",
  input: s.object({
    files: s.string,
  }),
  output: s.object({
    summary: s.string,
  }),
});

export default summarizeFiles;
