# rig

`rig` is a minimal TypeScript harness for structured agent calls.

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
  useEngine,
} from "rig";
```

- `agent(spec)` creates a typed agent function.
- `s.*` defines input/output schemas.
- `p.*` creates shell/file intents for inputs or prompt templates.
- `p\`...\`` inlines intent renderings into instruction text.
- `useEngine(engine)` sets the runtime engine.

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

- `src/samples/20-issue-reproducer.ts` — chained diagnose/fix/review flow
- `src/samples/36-subagent-delegation.ts` — delegation between focused agents
- `src/samples/47-shell-intents.ts` — shell/file intents as structured inputs
- `src/samples/50-end-to-end-release-agent.ts` — multi-step release planning workflow
- `src/samples/51-extensibility.ts` — lifecycle instrumentation for observing runs

## Agent behavior

- Default model: `gpt-4.1`
- Default max turns: `4`
- Default repair mode: `"default"`
- Retry loop reparses/revalidates responses until success or max turns

Per call, you can override `model`, `timeout`, `maxTurns`, and `signal`.

## Engine

`rig` uses the Copilot engine by default. You can override with:

```ts
import { useEngine } from "rig";
import { copilotEngine } from "rig/engines/copilot";

useEngine(copilotEngine());
```

By default, the Copilot engine starts Copilot CLI in server mode and connects to it through the SDK.

Engine contract:

```ts
type Engine = {
  createSession(options: { model: string }): EngineSession;
};

type EngineSession = {
  send(prompt: string, options: { signal?: AbortSignal }): Promise<string>;
};
```

For runnable programs, execute `rig.ts` directly and pass the root agent input on stdin:

```bash
echo "<input>" | node src/rig.ts src/samples/02-review-git-diff.ts
```

To run a root agent from a program file (default mode), export the root agent as the default export, pass the input text on stdin, and print the final answer to stdout:

```bash
echo "Summarize this repository" | node src/rig.ts src/program.ts
```

Copilot SDK lifecycle events are logged to stderr as JSONL.
## Extensibility

- Lifecycle events: `myAgent.subscribe(listener)`

Event types: `call`, `send`, `response`, `result`, `error`.

## Local development

```bash
npm test
npm run typecheck
```
