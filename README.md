# rig

`rig` is a small TypeScript harness for structured agent calls.

## Core API

```ts
import { agent, p, s, useEngine, validate } from "rig";
import { sh } from "rig";
```

- `agent(spec)` defines a typed structured agent.
- `p\`\`` builds instruction strings with inline shell helpers.
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

## Recommended generation order

When generating new rig programs, use this canonical order:

1. Start with `agent({ name, instructions, input, output })`.
2. Define explicit typed schemas with `s.object(...)` and `s.*`.
3. Add `sh.*` placeholders for shell/file context.
4. Add advanced fields (`permissions`, `agents`) only when needed.
5. Add call-time overrides (`model`, `timeout`, `maxTurns`, `signal`) at invocation time.

This keeps generated harnesses small, predictable, and easier to reproduce.

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
`sh.shell(...)` is an alias for `sh.text(...)` when you want a more natural name inside `p\`\`` instruction templates.

```ts
import { agent, p, s } from "rig";
import { sh } from "rig";

const reviewRepo = agent({
  name: "reviewRepo",
  instructions: p`Review the repository status using ${sh.shell("git status --short")} first.`,
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

Use shell intents as declarative placeholders in inputs and `p`` templates; avoid embedding raw shell instructions as free-form prose.

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

## Extensibility

Rig's extensibility model mirrors pi-agent's: **declaration merging** for custom types and **event subscription** for lifecycle observation.

### Custom intent types

Extend the intent system for new instruction categories without modifying core.

```ts
import { registerIntentRenderer } from "rig";

declare module "rig" {
  interface CustomIntents {
    http: HttpIntent;
  }
}

interface HttpIntent {
  __rig: "http";
  id: string;
  method: string;
  url: string;
}

registerIntentRenderer("http", (intent) => {
  const { method, url } = intent as HttpIntent;
  return `Fetch ${method} ${url} and return the response body`;
});
```

Custom intents work anywhere `sh.*` intents work: inline in input values, in `p\`\`` templates, and with `collectIntents`.

### Event subscription

Subscribe to agent lifecycle events with `myAgent.subscribe(listener)`. Returns an unsubscribe function.

```ts
import type { RigEvent } from "rig";

const unsubscribe = myAgent.subscribe((event: RigEvent) => {
  if (event.type === "result") console.log("output:", event.output);
  if (event.type === "error") console.error("error:", event.error);
});

// Detach when done
unsubscribe();
```

Event types: `call`, `send`, `response`, `result`, `error`. Listeners can be async and are awaited in registration order.



- define agents with `agent({ name, ... })`
- import shell helpers from `rig`
- use `s.*` for explicit schema helpers

Deprecated hooks and lifecycle middleware are removed.
Use `myAgent.subscribe()` and custom intent renderers for extensibility.

## Local development

```bash
npm install
npm test
npm run typecheck
npm run sample
```
