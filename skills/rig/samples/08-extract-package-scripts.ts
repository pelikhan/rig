import { agent, s } from "rig";
import { p } from "rig";
const FileSummary = s.object({
    file: s.string,
    title: s.string,
    summary: s.string,
    exports: s.array(s.string),
    risks: s.array(s.string)
});
const listFiles = agent({
    name: "listFiles",
    output: s.object({
        files: s.array(s.string)
    }),
    instructions: `Parse input.text as newline-delimited file paths.`,
});
const summarizeFile = agent({
    name: "summarizeFile",
    input: s.object({
        file: s.string,
        contents: s.string
    }),
    output: FileSummary,
    instructions: `Summarize the file contents.`,
});
const corpus = agent({
    name: "corpus",
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
const fileSummaries = await Promise.all(files.map((file) => summarizeFile({ file, contents: p.bash(`cat ${file}`) })));
console.log(await corpus({ files: fileSummaries }));

export default listFiles;
