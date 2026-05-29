# rig

`rig` is a small TypeScript harness for structured agent calls.

## Core API

```ts
import { agent, s, useEngine, validate } from "rig";
import { sh } from "rig";
```

- `agent(spec)` defines a typed structured agent.
- `s.*` defines explicit schemas.
- `useEngine(engine)` swaps the runtime engine.
- `validate(value, schema)` validates JSON-like data.
- `sh.*` creates inline shell instructions in agent input.

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

## Repair and retries

Agents retry invalid output up to `maxTurns`.

```ts
const summarize = agent({
  name: "summarize",
  instructions: "Summarize the diff.",
  input: s.object({ diff: s.string }),
  output: s.object({ summary: s.string }),
  maxTurns: 3,
  repair: "default",
});
```

If parsing or validation fails, rig sends an explicit repair prompt with the error and output schema.
You can disable repair with `repair: false` or provide `repair(error) => string`.

## Shell helpers

Shell helpers are part of the core API. In generated prompts, they are embedded directly into the input payload as "run this bash command" instructions.

```ts
import { agent, s } from "rig";
import { sh } from "rig";

const reviewRepo = agent({
  name: "reviewRepo",
  instructions: "Review the repository status.",
  input: s.object({
    status: s.string,
    diff: s.string,
  }),
  output: s.object({
    summary: s.string,
    findings: s.array(s.object({
      file: s.string,
      message: s.string,
    })),
  }),
});

await reviewRepo({
  status: sh.text("git status --short"),
  diff: sh.text("git diff --stat"),
});
```

RIG also supports explicit file operations aligned with PyAgent essentials:

```ts
sh.read("README.md")
sh.write("README.md", "# Updated\n")
```

`"rig/sh"` remains as a compatibility import and re-exports core `sh`.
## Engines

The core engine contract is tiny:

```ts
type Engine = {
  createSession(options: { model: string }): EngineSession;
};

type EngineSession = {
  send(prompt: string, options: { signal?: AbortSignal }): Promise<string>;
};
```

The default Copilot SDK engine lives in a separate module:

```ts
import { useEngine } from "rig";
import { copilotEngine } from "rig/engines/copilot";

useEngine(copilotEngine());
```

## API direction

Rig only documents and supports the current API:

- define agents with `agent({ name, ... })`
- import shell helpers from `rig/sh`
- use `s.*` for explicit schema helpers

Deprecated hooks and lifecycle middleware are removed from the core path.
Optional wrappers live in `rig/middleware`.

## Local development

```bash
npm install
npm test
npm run typecheck
npm run sample
```
