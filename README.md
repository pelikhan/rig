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
  sh,
  useEngine,
  validate,
  collectIntents,
  registerIntentRenderer,
} from "rig";
```

- `agent(spec)` creates a typed agent function.
- `s.*` defines input/output schemas.
- `sh.*` embeds shell/file intents in inputs or prompt templates.
- `p\`...\`` inlines intent renderings into instruction text.
- `validate(value, schema)` validates JSON-like values.
- `collectIntents(value)` extracts intents and replaces them with `$intent` references.
- `useEngine(engine)` sets the runtime engine.
- `registerIntentRenderer(namespace, fn)` adds custom intent rendering.

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

Shorthand object schemas are normalized:
- `{"name": ""}` -> required string field
- `{"name_": ""}` -> optional string field `name`
- `{"*": ""}` -> `Record<string, string>`

## Shell intents

```ts
sh.text("git status --short")
sh.result("npm test")
sh.read("README.md")
sh.write("README.md", "# Updated\n")
```

`sh.shell(...)` is an alias of `sh.text(...)`.

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

Engine contract:

```ts
type Engine = {
  createSession(options: { model: string }): EngineSession;
};

type EngineSession = {
  send(prompt: string, options: { signal?: AbortSignal }): Promise<string>;
};
```

## Extensibility

- Custom intents: declaration merging + `registerIntentRenderer(...)`
- Lifecycle events: `myAgent.subscribe(listener)`

Event types: `call`, `send`, `response`, `result`, `error`.

## Local development

```bash
npm test
npm run typecheck
```
