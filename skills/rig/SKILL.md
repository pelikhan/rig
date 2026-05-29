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

`sh` lives in core `rig` (with `rig/sh` compatibility re-export).
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

## Compatibility bridge

Still supported when migration is cheap:

- `agent("name", options)`
- old exemplar shapes
- `agent.enum([...])`
- `agent.literal(value)`
- `agent.nullable(shape)`
- `agent.unknown()`

Do not use deprecated hooks or lifecycle middleware in new code.
