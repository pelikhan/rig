import { agent } from "rig";
import { p } from "rig";

const FileSummary = {
  file: "src/index.ts",
  title: "Short title",
  summary: "Concise summary",
  exports: ["exported symbol"],
  risks: ["Potential risk"],
} as const;

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
  input: { files: [FileSummary] },
  output: {
    summary: "Repository summary",
    importantFiles: ["src/index.ts"],
    risks: ["Repository-wide risk"],
  },
  instructions: `Combine file summaries into a repository overview.`,
});

const { files } = await listFiles({
  text: p.text("find src -name '*.ts' -type f | sort"),
});

const fileSummaries = await Promise.all(
  files.map((file) => summarizeFile({ file, contents: p.text(`cat ${file}`) })),
);

console.log(await corpus({ files: fileSummaries }));
