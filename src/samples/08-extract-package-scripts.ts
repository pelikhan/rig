import { agent, p, s } from "rig";
const FileSummary = s.object({
    file: s.string,
    title: s.string,
    summary: s.string,
    exports: s.array(s.string),
    risks: s.array(s.string)
});
// Agent role: parse input.text as newline-delimited file paths.
const listFiles = agent({
    name: "listFiles",
    model: "mini",
    output: s.object({
        files: s.array(s.string)
    }),
    instructions: `Parse input.text as newline-delimited file paths.`,
});
// Agent role: summarize the file contents.
const summarizeFile = agent({
    name: "summarizeFile",
    model: "mini",
    input: s.object({
        file: s.string,
        contents: s.string
    }),
    output: FileSummary,
    instructions: `Summarize the file contents.`,
});
// Agent role: combine file summaries into a repository overview.
const corpus = agent({
    name: "corpus",
    model: "mini",
    input: s.object({
        files: s.array(FileSummary)
    }),
    output: s.object({
        summary: s.string,
        importantFiles: s.array(s.string),
        risks: s.array(s.string)
    }),
    instructions: `Combine file summaries into a repository overview.`,
});
const { files } = await listFiles({
    text: p.bash("find src -name '*.ts' -type f | sort"),
});
await corpus({
    files: await Promise.all(files.map((file) => summarizeFile({ file, contents: p.bash(`cat ${file}`) }))),
});

export default listFiles;
