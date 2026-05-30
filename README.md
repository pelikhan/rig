# rig

`rig` is a minimal TypeScript agent harness skill designed to be embedded in markdown workflows.

## Install

```bash
npm install
```

## Core API

```ts
import {
  agent,
  p,
  s,
} from "rig";
```

- `agent(spec)` creates a typed agent function.
- `s.*` defines input/output schemas.
- `p.*` creates declarative shell/file intents for inputs or prompt templates.
- `p\`...\`` inlines intent renderings into instruction text.

## Embedding in markdown

Use `rig` code fences in markdown files to define runnable harness programs:

````markdown
```rig
const root = agent({
  name: "review",
  instructions: "Summarize this repository.",
  output: s.object({ text: s.string }),
});
export default root;
```
````

Extract the `rig` fence and run it with:

```bash
awk '/^```rig$/{in_block=1;next}/^```$/{if(in_block){exit}}in_block' ./program.md | node skills/rig/rig.ts
```

## Quick start

```ts
import { agent, p, s } from "rig";

const FileNotes = s.object({
  file: s.string,
  summary: s.string,
  evidence: s.array(s.string),
});

// Agent role: choose the files most relevant to the research question.
const discoverFiles = agent({
  name: "discoverFiles",
  model: "nano",
  instructions: "Choose the files most relevant to the research question.",
  input: s.object({
    question: s.string,
    files: s.string,
  }),
  output: s.object({
    candidateFiles: s.array(s.string),
  }),
});

// Agent role: extract the facts from one file that answer the research question.
const readFile = agent({
  name: "readFile",
  model: "nano",
  instructions: "Extract the facts from one file that answer the research question.",
  input: s.object({
    question: s.string,
    file: s.string,
    contents: s.string,
  }),
  output: FileNotes,
});

// Agent role: combine the per-file notes into a concise research answer.
const synthesizeResearch = agent({
  name: "synthesizeResearch",
  model: "mini",
  instructions: "Combine the per-file notes into a concise research answer.",
  input: s.object({
    question: s.string,
    notes: s.array(FileNotes),
  }),
  output: s.object({
    answer: s.string,
    keyFiles: s.array(s.string),
    openQuestions: s.array(s.string),
  }),
});

const question = "How does the launcher choose a tsconfig file?";

const { candidateFiles } = await discoverFiles({
  question,
  files: p.bash("find src skills -name '*.ts' -type f 2>/dev/null | sort"),
});

const notes = await Promise.all(
  candidateFiles.map((file) =>
    readFile({
      question,
      file,
      contents: p.read(file),
    }),
  ),
);

await synthesizeResearch({
  question,
  notes,
});
```

## Schemas

```ts
s.string
s.number
s.boolean
s.unknown
s.array(item)
s.object(fields)
s.record(value)
s.enum(...values)
s.literal(value)
s.nullable(shape)
s.optional(shape)
```

Use declarative `s.*` helpers for every schema node.
Implicit object literals, trailing-underscore optional fields, and `{"*": ...}` record sugar are not supported.

## Shell intents

```ts
p.bash("git status --short")
p.result("npm test")
p.read("README.md")
p.write("README.md", "# Updated\n")
```

## Evaluating agentic performance

Use these samples to quickly gauge how well `rig` supports increasingly agentic workflows:

- `skills/rig/samples/20-issue-reproducer.md` — chained diagnose/fix flow
- `skills/rig/samples/36-subagent-delegation.md` — delegation between focused agents
- `skills/rig/samples/47-shell-intents.md` — shell/file intents as structured inputs
- `skills/rig/samples/50-end-to-end-release-agent.md` — multi-step release planning workflow

## Agent behavior

- Default model: `gpt-4.1`
- Default max turns: `4`
- Default repair mode: `"default"`
- Retry loop reparses/revalidates responses until success or max turns

Per call, you can override `model`, `timeout`, `maxTurns`, and `signal`.

## Copilot SDK runtime

`rig` is specialized for Copilot SDK sessions.

By default it connects to an already-running Copilot server via HTTP (`COPILOT_SDK_URI`, then `localhost:7777`).
Pass `--server` to spawn the server over stdio when launching a program.
Run `node skills/rig/rig.ts --help` for CLI usage; the launcher also accepts common help aliases such as `-h`, `help`, `/help`, and `/?`.

For runnable programs, you can pipe a rig program directly on stdin (assumes the Copilot server is already running):

```bash
cat <<'RIG' | node skills/rig/rig.ts
const root = agent({
  name: "review",
  instructions: "Summarize this repository.",
  output: s.object({ text: s.string }),
});
export default root;
RIG
```

Inline stdin programs run a root agent with no required external input and write the result to stdout. If `export default` is omitted, the harness defaults to the first `const/let/var name = agent(...)` assignment.  
`import { agent, p, s } from "rig"` is optional in inline mode because the harness injects it when missing.

Inline mode accepts root agents that either omit `input`, use `input: s.object({})`, or rely on the default `input: s.object({ text: s.string })` (which is invoked with `{ text: "" }`).

Pass `--server` to start the Copilot server automatically as part of the run:

```bash
cat ./program.ts | node skills/rig/rig.ts --server
```

Pass `--typecheck` to typecheck the rig program before execution:

```bash
cat ./program.ts | node skills/rig/rig.ts --typecheck
```

To run a root agent from a program file, export the root agent as the default export and pass input on stdin:

```bash
echo "Summarize this repository" | node skills/rig/rig.ts src/program.ts
```

Program-file mode also supports `--typecheck`:

```bash
echo "Summarize this repository" | node skills/rig/rig.ts src/program.ts --typecheck
```

For program-file mode stdin coercion:
- if root input schema is `string`, stdin is passed as raw text
- if root input schema is an object containing `text`, stdin is passed as `{ text: "<stdin>" }`
- otherwise stdin must be valid JSON for the declared input schema

Copilot SDK lifecycle events and rig request events are logged to stderr as JSONL.

## Local development

```bash
npm test
npm run typecheck
```
