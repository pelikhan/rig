# rig

Minimal TypeScript harness for structured agent calls.

## Imports

```ts
import { agent, s, useEngine, validate } from "rig";
import { sh } from "rig";
```

## `agent(spec)`

Declare a typed structured agent.

```ts
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

### Spec fields

| Field | Purpose |
|-------|---------|
| `name` | Agent name used in the prompt |
| `instructions` | Prompt instructions |
| `input` | Input schema |
| `output` | Output schema |
| `model` | Model name, default `"gpt-4.1"` |
| `maxTurns` | Retry budget for invalid JSON or invalid output |
| `repair` | `false`, `"default"`, or `(error) => string` |

## `s` schema helpers

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

## `validate(value, schema)`

Validate parsed data against a schema.

```ts
const result = validate({ label: "bug" }, s.object({ label: s.string }));
```

## `sh` intents

`sh` lives in core `rig`.
These are declarative placeholders, not real shell execution in the core harness.

```ts
sh.text("git diff")
sh.result("npm test")
sh.read("README.md")
sh.write("README.md", "# Hello\n")
```

## Engines

Use `useEngine(engine)` to install a custom engine.
The default Copilot SDK engine is available from `rig/engines/copilot`.

```ts
import { useEngine } from "rig";
import { copilotEngine } from "rig/engines/copilot";

useEngine(copilotEngine());
```

## API direction

Use only the current API:

- `agent({ name, ... })`
- `rig` for shell helpers
- `s.*` for explicit schema helpers
- `intent()`, `input()`, `output()`, `defineExtension()`, `useExtension()` for extensions

Do not add deprecated hooks, lifecycle middleware, or compatibility layers.

## Extensions

Rig has a small extension system inspired by `@earendil-works/pi-agent-core`.
Three slots, all optional:

- `sh` — named `Intent` factories (declarative placeholders)
- `inputs` — named `Input<T>` (schema + optional prompt rendering)
- `outputs` — named `Output<T>` (schema + optional custom parser + optional repair)

Plus optional `agents`, single `on(event)` observer, and `wrapEngine(next)`.

### Authoring

```ts
import { defineExtension, intent, input, output, s, agent } from "rig";

export const github = defineExtension({
  name: "github",
  sh: {
    issue: (n: number) => intent("github.issue", { number: n }),
  },
  inputs: {
    Issue: input({
      schema: s.object({ number: s.number, title: s.string }),
      render: (i) => `<issue number="${i.number}">${i.title}</issue>`,
    }),
  },
  outputs: {
    Patch: output({
      schema: s.object({ diff: s.string }),
      parse: (response) => ({ diff: response.replace(/^DIFF:\s*/, "") }),
    }),
  },
  on:         (event) => { /* { type: "call" | "result" | "error", ... } */ },
  wrapEngine: (next)  => withRetry(next),
});
```

### Installing

```ts
import { useExtension } from "rig";
useExtension(github);                                   // global
agent({ name: "x", extensions: [github], output: ... }); // scoped
```

`inputs` and `outputs` are reached through the typed extension value
(`github.inputs.Issue`) — never by global string name. `useExtension` is
idempotent by object identity.

### `Input<T>` and `Output<T>`

```ts
input({ schema, render? })
output({ schema, parse?, repair? })
```

`agent({ input, output })` accepts either a bare schema or an `Input<T>` /
`Output<T>` wrapper. Custom `parse` errors participate in the repair loop
the same way invalid JSON does.

### Repair precedence

`CallOptions.repair` > `AgentSpec.repair` > `Output.repair` > built-in default.

### `wrapEngine` composition

First registered = outermost. `[A, B]` composes as `A(B(engine))`.

### Hooks

Single observer: `on(event)`. Event is a discriminated union of
`{ type: "call" | "result" | "error", agent, turn, ... }`. Throwing from
`on` aborts the call.

