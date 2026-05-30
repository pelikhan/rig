# rig

Minimal TypeScript agent harness skill for structured agent calls, intended for embedding in markdown with `rig` code fences.

## Preferred imports

```ts
import { agent, p, s } from "rig";
```

## Recommended default pattern

Prefer this shape when generating a new rig program:

```ts
import { agent, p, s } from "rig";

// Agent role: review the diff and return only the declared output.
const reviewDiff = agent({
  name: "reviewDiff",
  model: "mini",
  instructions: "Review the diff and return only the declared output.",
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

export default reviewDiff;
```

## Fast generation checklist

Use this checklist before finalizing generated code:

1. Use a single `import { ... } from "rig"` statement.
2. Use `agent({ ... })` with explicit `name`, `instructions`, `input`, and `output`.
3. Define input/output with `s.object(...)` and explicit `s.*` helpers.
4. Keep output schema strict (enums/literals for constrained values).
5. Add a `// Agent role: ...` comment above each agent declaration.
6. Set `model` explicitly to `"large"`, `"mini"`, or `"nano"`.
7. Use `p.*` placeholders for shell/file context instead of free-form shell prose.
8. Put stable defaults in spec; put per-call overrides in call options.
9. Add `permissions`/`agents` only when required by the scenario.
10. Avoid `console.log(...)` in snippets.
11. For inline markdown skill mode, export exactly one default root agent with no input and do not call it directly.

## Canonical construction order

Use this order to reduce syntax drift:

1. Core agent shape: `agent({ name, instructions, input, output })`.
2. Explicit typed schemas with `s.object(...)` and `s.*`.
3. Shell intents with `p.*` (inputs or `p`` templates).
4. Advanced spec fields (`permissions`, `agents`) when scenario needs them.
5. Invocation overrides (`model`, `timeout`, `maxTurns`, `signal`) at call time.

## `agent(spec)`

Declare a structured agent.

### Spec fields

| Field | Purpose |
|-------|---------|
| `name` | Agent name used in the prompt |
| `instructions` | Prompt instructions |
| `input` | Input schema |
| `output` | Output schema |
| `model` | Default model name; examples should use `"large"`, `"mini"`, or `"nano"` |
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

## Prompt helpers

`p` is both the prompt template tag and the shell/file helper namespace.
These helpers are declarative placeholders, not direct shell execution in the core harness.

```ts
p.bash("git diff -- .")
p.result("npm test")
p.read("README.md")
p.write("README.md", "# Hello\n")
```

Use `p.*` helpers:

- in input values
- inside `p\`\`` instruction templates

```ts
const prompt = p`Review the repository status using ${p.bash("git status --short")}.`;
```

## Call-time options

Pass overrides when calling an agent:

```ts
const controller = new AbortController();

const result = await myAgent(input, {
  model: "mini",
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
// Agent role: extract the most important changes from the diff.
const summarizeDiff = agent({
  name: "summarizeDiff",
  model: "mini",
  input: s.object({ diff: s.string }),
  output: s.object({ summary: s.string }),
});

// Agent role: review the diff using the provided subagent when helpful.
const reviewer = agent({
  name: "reviewer",
  model: "mini",
  input: s.object({ diff: s.string }),
  output: s.object({
    summary: s.string,
    issues: s.array(s.string),
  }),
  agents: { summarizeDiff },
  instructions: "Review the diff. You may use the provided subagent conceptually.",
});
```

When delegating task resolution, keep each subagent narrow and explicit (for example: `analyzeTask`, `draftRigProgram`, `verifySchema`) and make the root agent instructions require combining their outputs into one final response.

## Task harness pattern for rig markdown

When the task asks for a runnable markdown example, require exactly one fenced ````rig` block that is valid inline harness input:

- include `import { ... } from "rig"` (or rely on inline injection intentionally)
- define one default-exported no-input root agent
- avoid calling the root agent directly in the snippet
- keep the block aligned with this skill's construction order and checklist

## Repair and retries

Agents retry invalid output up to `maxTurns`.

```ts
// Agent role: repair invalid output and return a stable summary.
const summarize = agent({
  name: "summarize",
  model: "mini",
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

## Running programs

Treat fenced `rig` code blocks in markdown as runnable rig programs.
Run them by extracting the fence content and piping it into `node skills/rig/rig.ts`.
Inline programs run a no-input root agent and write stdout. If `export default` is omitted, the harness defaults to the first `const/let/var name = agent(...)` assignment:

```bash
cat <<'RIG' | node skills/rig/rig.ts
// Agent role: summarize this repository in one sentence.
const root = agent({
  name: "review",
  model: "mini",
  instructions: "Summarize this repository in one sentence.",
  output: s.object({ text: s.string }),
});
export default root;
RIG
```

`import { agent, p, s } from "rig"` is optional in inline mode; the harness injects it if omitted.

The harness also supports program-file mode. Export the root agent as the default export and pass input on stdin:

```bash
echo "Review this diff" | node skills/rig/rig.ts src/program.ts
```

Pass `--server` to have the harness start the Copilot server automatically before running:

```bash
echo "Review this diff" | node skills/rig/rig.ts src/program.ts --server
```

## Copilot SDK runtime

`rig` is specialized for Copilot SDK sessions and no longer exposes a custom engine mount API.
By default it connects over HTTP using `COPILOT_SDK_URI`, then `AGENT_HTTP_URL`, then `localhost:7777`.
Use `--server` at launch time when you want the harness to start the Copilot server via stdio.

## Patterns to prefer

- Prefer `s.object(...)` for important examples.
- Keep outputs small, typed, and explicit.
- Use `s.enum(...)` and `s.literal(...)` when exact values matter.
- Use `p.*` in inputs instead of embedding command text in prose.
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
- `p.*` and `p\`...\`` from `rig`
- `s.*` for explicit schema helpers

Do not add deprecated hooks or compatibility layers.
