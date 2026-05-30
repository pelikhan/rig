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

## Extensibility

### Custom intent types (`CustomIntents`)

Extend the intent system via declaration merging — analogous to pi-agent's `CustomAgentMessages`.

```ts
import { registerIntentRenderer } from "rig";

declare module "rig" {
  interface CustomIntents {
    http: HttpIntent;
  }
}

registerIntentRenderer("http", (intent) => {
  const { method, url } = intent as HttpIntent;
  return `Fetch ${method} ${url} and return the response body`;
});
```

Custom intents work in input values, `p` templates, and `collectIntents`.

### Event subscription (`subscribe`)

Observe lifecycle events on any agent without wrapping it — analogous to pi-agent's `Agent.subscribe()`.

```ts
import type { RigEvent } from "rig";

const unsubscribe = myAgent.subscribe((event: RigEvent) => {
  if (event.type === "result") console.log(event.output);
});
unsubscribe();
```

Event types: `call`, `send`, `response`, `result`, `error`. Async listeners are awaited.

## API direction

Use only the current API:

- `agent({ name, ... })`
- `rig` for shell helpers and intent APIs
- `s.*` for explicit schema helpers
- `myAgent.subscribe(listener)` for lifecycle observation
- `registerIntentRenderer(ns, fn)` for custom intent rendering

Do not add deprecated hooks or compatibility layers.
