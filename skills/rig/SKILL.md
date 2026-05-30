# rig

Minimal TypeScript harness for structured agent calls.

## Preferred imports

```ts
import { agent, collectIntents, p, s, useEngine, validate } from "rig";
import { sh } from "rig";
import type { RigEvent } from "rig";
```

## Recommended default pattern

Prefer this shape when generating a new rig program:

```ts
import { agent, s } from "rig";
import { sh } from "rig";

const reviewDiff = agent({
  name: "reviewDiff",
  instructions: "Review the diff and return only the declared output.",
  input: s.object({
    diff: s.string,
    status: s.string,
  }),
  output: s.object({
    summary: s.string,
    risk: s.enum("low", "medium", "high"),
    findings: s.array(s.object({
      file: s.string,
      message: s.string,
      line: s.optional(s.number),
    })),
  }),
});

const result = await reviewDiff({
  diff: sh.text("git diff -- ."),
  status: sh.text("git status --short"),
});
```

## Fast generation checklist

Use this checklist before finalizing generated code:

1. Use `agent({ ... })` with explicit `name`, `instructions`, `input`, and `output`.
2. Define input/output with `s.object(...)` and explicit `s.*` helpers.
3. Keep output schema strict (enums/literals for constrained values).
4. Use `sh.*` placeholders for shell/file context instead of free-form shell prose.
5. Put stable defaults in spec; put per-call overrides in call options.
6. Add `permissions`/`agents` only when required by the scenario.

## `agent(spec)`

Declare a structured agent.

### Spec fields

| Field | Purpose |
|-------|---------|
| `name` | Agent name used in the prompt |
| `instructions` | Prompt instructions |
| `input` | Input schema |
| `output` | Output schema |
| `model` | Default model name, falling back to `"gpt-4.1"` |
| `timeout` | Default timeout in milliseconds |
| `maxTurns` | Retry budget for invalid JSON or invalid output |
| `repair` | `false`, `"default"`, or `(error) => string` |
| `permissions` | Optional shell/write permission hints |
| `agents` | Optional named subagents exposed to the harness |

Use `agent({ name, ... })` as the only agent declaration form.

## Schemas

Use `s.*` helpers for input and output schemas.

```ts
input: s.object({
  title: s.string,
  severity: s.enum("low", "medium", "high"),
})
```

Use explicit schemas in docs and generated samples.

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

Common examples:

```ts
s.enum("bug", "feature", "question")
s.literal("review-finding")
s.nullable(s.string)
s.optional(s.number)
s.record(s.string)
```

## Shell intents

`sh` lives in core `rig`.
These are declarative placeholders, not direct shell execution in the core harness.

```ts
sh.text("git diff -- .")
sh.result("npm test")
sh.read("README.md")
sh.write("README.md", "# Hello\n")
```

Use shell intents:

- in input values
- inside `p\`\`` instruction templates
- with `collectIntents(...)`

```ts
const prompt = p`Review the repository status using ${sh.text("git status --short")}.`;
```

## Call-time options

Pass overrides when calling an agent:

```ts
const controller = new AbortController();

const result = await myAgent(input, {
  model: "gpt-4.1",
  timeout: 30_000,
  maxTurns: 2,
  signal: controller.signal,
});
```

Use call-time options for per-run changes. Use spec fields for stable defaults.

## Permissions

Use `permissions` to describe shell and write expectations for the harness:

```ts
permissions: {
  shell: "readonly",
  write: "deny",
}
```

Valid values:

- `shell`: `"deny" | "readonly" | "ask" | "allow"`
- `write`: `"deny" | "workspace" | "allow"`

## Subagents

Expose subagents with `agents`:

```ts
const summarizeDiff = agent({
  name: "summarizeDiff",
  input: s.object({ diff: s.string }),
  output: s.object({ summary: s.string }),
});

const reviewer = agent({
  name: "reviewer",
  input: s.object({ diff: s.string }),
  output: s.object({
    summary: s.string,
    issues: s.array(s.string),
  }),
  agents: { summarizeDiff },
  instructions: "Review the diff. You may use the provided subagent conceptually.",
});
```

## Repair and retries

Agents retry invalid output up to `maxTurns`.

```ts
const summarize = agent({
  name: "summarize",
  input: s.object({ diff: s.string }),
  output: s.object({ summary: s.string }),
  maxTurns: 3,
  repair: "default",
});
```

Use:

- `repair: "default"` for standard repair prompts
- `repair: false` to disable repair
- `repair(error) => string` for custom repair instructions

## Validation helpers

Use `validate(value, schema)` to validate parsed data explicitly.

```ts
const result = validate({ label: "bug" }, s.object({ label: s.string }));
```

Use `collectIntents(value)` when you need both the normalized value and extracted intents.

```ts
const input = { diff: sh.text("git diff -- .") };
const { value, intents } = collectIntents(input);
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

### Custom intent types

Extend the intent system via declaration merging.

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

### Event subscription

Observe lifecycle events on any agent without wrapping it:

```ts
const unsubscribe = myAgent.subscribe((event: RigEvent) => {
  if (event.type === "result") console.log(event.output);
});

unsubscribe();
```

Event types:

- `call`
- `send`
- `response`
- `result`
- `error`

## Patterns to prefer

- Prefer `s.object(...)` for important examples.
- Keep outputs small, typed, and explicit.
- Use `s.enum(...)` and `s.literal(...)` when exact values matter.
- Use `sh.*` in inputs instead of embedding command text in prose.
- Put durable defaults in the agent spec and per-run overrides in call options.
- Introduce `permissions` and `agents` only when the scenario needs them.

## Patterns to avoid

- Do not invent deprecated hooks or compatibility layers.
- Do not import shell helpers from anywhere except `rig`.
- Do not leave outputs as unstructured prose when a schema would help.
- Do not invent alternate schema syntaxes when explicit `s.*` is available.
- Do not put call-time overrides (`model`, `timeout`, `maxTurns`, `signal`) into unrelated config objects.

## API direction

Use only the current API:

- `agent({ name, ... })`
- `sh.*` from `rig`
- `s.*` for explicit schema helpers
- `collectIntents(value)` for extracted intents
- `myAgent.subscribe(listener)` for lifecycle observation
- `registerIntentRenderer(ns, fn)` for custom intent rendering

Do not add deprecated hooks or compatibility layers.
