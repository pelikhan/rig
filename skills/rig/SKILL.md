# rig

Minimal TypeScript agent harness. All imports come from `"rig"`.

```ts
import { agent, sh } from "rig";
```

## `agent(name, opts?)`

Declare a typed agent. The engine validates output against the shape at runtime.

```ts
const classify = agent("classify", {
  input: { title: "", body: "" },
  output: {
    label: agent.enum(["bug", "feature", "question"]),
    confidence: agent.enum(["low", "medium", "high"]),
  },
  instructions: `Classify the issue.`,
});
const result = await classify({ title: "Crash on start", body: "segfault" });
```

### Options

| Field | Purpose |
|-------|---------|
| `input` | Shape descriptor (values are type exemplars, not defaults) |
| `output` | Shape descriptor for validated return value |
| `instructions` | System prompt text |
| `model` | Model name (default `"gpt-4.1"`) |
| `timeout` | ms before abort |
| `max_turns` | Retry budget for invalid output (default 4) |
| `permissions` | `{ shell?: "deny"|"readonly"|"ask"|"allow", write?: "deny"|"workspace"|"allow" }` |
| `agents` | `Record<string, AgentFn>` — subagents available to this agent |

### Shape markers

| Marker | Meaning |
|--------|---------|
| `agent.enum(["a","b"])` | Value must be one of the literals |
| `agent.literal(true)` | Exact value |
| `agent.nullable("text")` | The inner type or `null` |
| `agent.unknown()` | Any JSON value |
| `{ "*": "v" }` | Record/map with string keys |
| `key_: type` | Trailing `_` = optional field (key emitted without `_`) |

## `sh` — declarative shell intents

Intents are placeholders resolved by the engine, not executed in-process.

```ts
sh.text("git diff")                       // resolves to stdout string
sh.result("npm test")                     // resolves to { ok, stdout, stderr, exitCode }
sh.write("README.md", "# Hello\n")       // resolves to write status object
```

Options: `{ cwd?, env?, timeout?, purpose?, signal? }`

## Call options

Override per-call:

```ts
await myAgent({ text: "go" }, { model: "o3-mini", timeout: 5000, max_turns: 2, signal });
```

## Patterns

**Subagent delegation:**
```ts
const sub = agent("sub", { input: { q: "" }, output: { a: "" } });
const parent = agent("parent", { agents: { sub }, output: { result: "" } });
```

**Passing shell context as input:**
```ts
await investigator({
  tree: sh.text("find . -type f"),
  config: sh.text("cat package.json"),
});
```
