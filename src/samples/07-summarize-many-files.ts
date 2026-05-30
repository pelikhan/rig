import { agent, s, p } from "rig";

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

const result = await summarizeFiles({
  files: p.bash("find src -name '*.ts' -type f | sort"),
});

console.log(result.summary);
