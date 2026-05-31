# rig

Minimal TypeScript agent harness skill for structured agent calls inside sandboxed agentic workflows, intended for embedding in markdown with `rig` code fences.

## Install

Install the latest GitHub release directly:

```bash
npm install github:pelikhan/rig#v0.0.8
```

Or clone the skill for Copilot coding agent:

```bash
gh skills clone pelikhan/rig
```

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
2. Use `agent({ ... })` with explicit `name`; keep `instructions` and `output` explicit, and include `input` when the scenario needs it.
3. Define input/output with `s.object(...)` and explicit `s.*` helpers.
4. Keep output schema strict (enums/literals for constrained values).
5. Add a `// Agent role: ...` comment above each agent declaration.
6. Set `model` explicitly to `"large"`, `"mini"`, or `"nano"`.
7. Prefer `${p.read(...)}` / `${p.bash(...)}` inside `p\`\`` templates when the context source is already known; add input fields only for true caller-provided data.
8. Put stable defaults in spec; register middleware in spec or with `agent.use(...)`.
9. Add `agents` only when required by the scenario.
10. Avoid `console.log(...)` in snippets.
11. For inline markdown skill mode, export exactly one default root agent with no input and do not call it directly.

## Canonical construction order

Use this order to reduce syntax drift:

1. Core agent shape: `agent({ name, instructions, input, output })`.
2. Explicit typed schemas with `s.object(...)` and `s.*`.
3. Shell/file context with `p\`\`` and `${p.*}` before adding extra input plumbing.
4. Advanced spec fields (`agents`) when scenario needs them.
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
| `maxTurns` | Retry budget for invalid JSON or invalid output |
| `middleware` | Per-turn middleware for steering, validation, and retry customization |
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
s.optional(shape)
```

Common examples:

```ts
s.enum("bug", "feature", "question")
s.optional(s.number)
s.record(s.string)
```

## Prompt helpers

`p` is both the prompt template tag and the shell/file helper namespace.
These helpers are declarative placeholders, not direct shell execution in the core harness.
Prefer template expressions when the context source is already known.
Prefer `p.read("path")` over `p.bash("cat path")`, and keep large context in files instead of building in-memory strings just to feed an agent.
Rig assumes the surrounding workflow already provides the sandbox and protections it needs, so shell/file intents should execute directly without extra permission prompts.

```ts
p.bash("git diff -- .")
p.result("npm test")
p.read("README.md")
p.write("README.md", "# Hello\n")
```

Use `p.*` helpers:

- in input values
- inside `p\`\`` instruction templates, preferably as the default pattern

```ts
const prompt = p`Review the repository status using ${p.bash("git status --short")}.`;
```

Only introduce `input` fields for data the caller truly supplies at runtime. Do not require inputs just to thread known file or shell context into the prompt.

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

Use call-time options for per-run changes. Use middleware for stable defaults (for example `timeout({ timeout: ... })`).

## Subagents

Expose subagents with `agents`:

```ts
// Agent role: extract the most important changes from the diff.
const summarizeDiff = agent({
  name: "summarizeDiff",
  model: "mini",
});

// Agent role: review the diff using the provided subagent when helpful.
const reviewer = agent({
  name: "reviewer",
  model: "mini",
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

Rig starts with no middleware by default. Opt into retry behavior with `repair` from `rig/addons`.

```ts
import { repair } from "rig/addons";

// Agent role: repair invalid output and return a stable summary.
const summarize = agent({
  name: "summarize",
  model: "mini",
  maxTurns: 3,
  middleware: repair,
});
```

Use middleware to steer retry prompts when needed (for example `steering()` from `rig/addons`).

## Running programs

Treat fenced `rig` code blocks in markdown as runnable rig programs.
Run them by extracting the fence content and piping it into `node skills/rig/rig.ts`.
Inline programs run a root agent with no required external input and write stdout. If `export default` is omitted, the harness defaults to the first `const/let/var name = agent(...)` assignment:

```bash
cat <<'RIG' | node skills/rig/rig.ts
// Agent role: summarize this repository in one sentence.
const root = agent({
  name: "review",
  model: "mini",
  instructions: "Summarize this repository in one sentence.",
});
export default root;
RIG
```

`import { agent, p, s } from "rig"` is optional in inline mode; the harness injects it if omitted.

Inline mode accepts root agents that either omit `input`, use `input: s.object({})`, or rely on the default `input: s.string` (which is invoked with `""`).

The harness also supports program-file mode. Export the root agent as the default export and pass input on stdin:

```bash
echo "Review this diff" | node skills/rig/rig.ts src/program.ts
```

Pass `--server` to have the harness start the Copilot server automatically before running:

```bash
echo "Review this diff" | node skills/rig/rig.ts src/program.ts --server
```

Pass `--typecheck` to typecheck the rig program before execution:

```bash
cat <<'RIG' | node skills/rig/rig.ts --typecheck
const root = agent({
  name: "review",
  model: "mini",
});
export default root;
RIG
```

Program-file mode also supports `--typecheck`:

```bash
echo "Review this diff" | node skills/rig/rig.ts src/program.ts --typecheck
```

## Copilot SDK runtime

`rig` is specialized for Copilot SDK sessions and no longer exposes a custom engine mount API.
By default it connects over HTTP using `COPILOT_SDK_URI`, then `localhost:7777`.
Use `--server` at launch time when you want the harness to start the Copilot server via stdio.

## Patterns to prefer

- Prefer `s.object(...)` for important examples. Omit schemas entirely when the default free-form string is enough.
- Keep outputs small, typed, and explicit.
- Use `s.enum(...)` when exact values matter.
- Prefer `p.*` inside `p\`\`` templates; fall back to inputs only for real caller-provided data.
- Prefer `p.read(...)` for existing files instead of shelling out through `cat`.
- Put durable defaults in the agent spec; register middleware in spec or with `agent.use(...)`.
- Use `steering()` from `rig/addons` when you want the builtin last-retry warning middleware; it is opt-in.
- Introduce `agents` only when the scenario needs them.

## Patterns to avoid

- When a free-form string is enough, omit `input`/`output` and use the default `s.string` schemas.
- Do not wrap a single string field in an input object just to carry text.
- Do not import shell helpers from anywhere except `rig`.
- Do not require `input` fields just to pass `p.read(...)` / `p.bash(...)` context into instructions.
- Do not leave outputs as unstructured prose when a schema would help.
- Do not invent alternate schema syntaxes when explicit `s.*` is available.
- Do not replace file reads with `cat`-style shell commands or large in-memory strings when a file path already exists.
- Do not put call-time overrides (`model`, `timeout`, `maxTurns`, `signal`) into unrelated config objects.

## API direction

Use only the current API:

- `agent({ name, ... })`
- `p.*` and `p\`...\`` from `rig`
- `s.*` for explicit schema helpers
- `repair` / `steering` from `rig/addons` for optional middleware addons

Do not add deprecated hooks or compatibility layers.
