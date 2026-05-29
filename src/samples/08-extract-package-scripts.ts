import { agent, s } from "rig";
import { sh } from "rig/sh";

const FileSummary = s.object({
  file: s.string,
  title: s.string,
  summary: s.string,
  exports: s.array(s.string),
  risks: s.array(s.string),
});

const listFiles = agent({
  name: "listFiles",
  output: { files: ["src/index.ts"] },
  instructions: `Parse input.text as newline-delimited file paths.`,
});

const summarizeFile = agent({
  name: "summarizeFile",
  input: { file: "src/index.ts", contents: "source code" },
  output: FileSummary,
  instructions: `Summarize the file contents.`,
});

const corpus = agent({
  name: "corpus",
  input: { files: s.array(FileSummary) },
  output: {
    summary: "Repository summary",
    importantFiles: ["src/index.ts"],
    risks: ["Repository-wide risk"],
  },
  instructions: `Combine file summaries into a repository overview.`,
});

const { files } = await listFiles({
  text: sh.text("find src -name '*.ts' -type f | sort"),
});

const fileSummaries = await Promise.all(
  files.map((file) => summarizeFile({ file, contents: sh.text(`cat ${file}`) })),
);

console.log(await corpus({ files: fileSummaries }));
