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
  registerIntentRenderer,
} from "rig";
```

- `agent(spec)` creates a typed agent function.
- `s.*` defines input/output schemas.
- `p.*` creates shell/file intents for inputs or prompt templates.
- `p\`...\`` inlines intent renderings into instruction text.
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
p.text("git status --short")
p.result("npm test")
p.read("README.md")
p.write("README.md", "# Updated\n")
```

`p.shell(...)` is an alias of `p.text(...)`.

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

For runnable programs, use the launcher CLI to mount the Copilot engine and execute a file:

```bash
node src/launcher.ts src/samples/02-review-git-diff.ts
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
