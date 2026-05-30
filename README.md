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
- `p.*` creates shell/file intents for inputs or prompt templates.
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
import { agent, s } from "rig";

const classify = agent({
  name: "classify",
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

const result = await classify({
  title: "Crash on start",
  body: "segfault",
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

- `skills/rig/samples/20-issue-reproducer.ts` — chained diagnose/fix/review flow
- `skills/rig/samples/36-subagent-delegation.ts` — delegation between focused agents
- `skills/rig/samples/47-shell-intents.ts` — shell/file intents as structured inputs
- `skills/rig/samples/50-end-to-end-release-agent.ts` — multi-step release planning workflow

## Agent behavior

- Default model: `gpt-4.1`
- Default max turns: `4`
- Default repair mode: `"default"`
- Retry loop reparses/revalidates responses until success or max turns

Per call, you can override `model`, `timeout`, `maxTurns`, and `signal`.

## Copilot SDK runtime

`rig` is specialized for Copilot SDK sessions.

By default it connects to an already-running Copilot server via HTTP (`AGENT_HTTP_URL` or `localhost:7777`).
Pass `--server` to spawn the server over stdio when launching a program.

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

Inline stdin programs must export one default root agent with no input. The harness invokes it and writes the result to stdout.  
`import { agent, p, s } from "rig"` is optional in inline mode because the harness injects it when missing.

Pass `--server` to start the Copilot server automatically as part of the run:

```bash
cat ./program.ts | node skills/rig/rig.ts --server
```

To run a root agent from a program file, export the root agent as the default export, pass the input text on stdin, and print the final answer to stdout:

```bash
echo "Summarize this repository" | node skills/rig/rig.ts src/program.ts
```

Copilot SDK lifecycle events are logged to stderr as JSONL.

## Local development

```bash
npm test
npm run typecheck
```
