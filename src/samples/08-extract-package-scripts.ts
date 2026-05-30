import { agent, s, p } from "rig";

const FileSummary = s.object({
    file: s.string,
    title: s.string,
    summary: s.string,
    exports: s.array(s.string),
    risks: s.array(s.string)
});

// Parses a newline-delimited list of file paths into a structured array.
const listFiles = agent({
    name: "listFiles",
    output: s.object({
        files: s.array(s.string)
    }),
    instructions: `Parse input.text as newline-delimited file paths.`,
});

// Summarizes a single source file, listing its exports and any notable risks.
const summarizeFile = agent({
    name: "summarizeFile",
    input: s.object({
        file: s.string,
        contents: s.string
    }),
    output: FileSummary,
    instructions: `Summarize the file contents.`,
});

// Combines individual file summaries into a repository-level overview with key
// files and risk areas highlighted.
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

export default listFiles;
