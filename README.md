# rig

`rig` is a minimal TypeScript agent harness skill designed to run inside sandboxed agentic workflows embedded in markdown.

## Install

```bash
npm install github:pelikhan/rig#v0.0.8
```

Or install the skill for Copilot coding agent:

```bash
gh skills clone pelikhan/rig
```

## Core API

```ts
import {
  agent,
  p,
  s,
} from "rig";
import { addons, repair, steering } from "rig/addons";
```

- `agent(spec)` creates a typed agent function.
- `s.*` defines input/output schemas. Omit `input`/`output` when free-form strings are enough.
- `p.*` creates declarative shell/file intents for prompt templates or inputs.
- `addon` accepts express-like `(context, next)` turn addons for steering, inline validation, and Copilot session access.
- `rig` starts with no default addons.
- `rig/addons` provides optional addon helpers: `repair`, `steering`, and `addons.{repair,steering}`.
- `p\`...\`` inlines intent renderings into instruction text; prefer `${p.read(...)}` / `${p.bash(...)}` there when the context source is already known.

## Embedding in markdown

Use `rig` code fences in markdown files to define runnable harness programs:

````markdown
```rig
const root = agent({
  name: "review",
  instructions: "Summarize this repository.",
});
export default root;
```
````

Extract the `rig` fence and run it with:

```bash
awk '/^```rig$/{in_block=1;next}/^```$/{if(in_block){exit}}in_block' ./program.md | node skills/rig/rig.ts
```

## Quick start

```ts
import { agent, p, s } from "rig";

// Agent role: extract package scripts and summarize what they do.
const extractScripts = agent({
  name: "extractScripts",
  model: "nano",
  instructions: p`Read ${p.read("package.json")} and summarize the package scripts. Use ${p.bash("find src -name '*.ts' -type f | sort")} only to call out source files that look relevant.`,
  output: s.object({
    scriptsByName: s.record(s.string),
    summary: s.string,
    relatedFiles: s.array(s.string),
  }),
});

export default extractScripts;
```

When the context already lives in the workspace, prefer intent templates like the example above over adding `input` fields just to shuttle shell output or file contents. Favor `p.read("path")` over `p.bash("cat path")`, and let the harness work from files instead of assembling large in-memory strings first.

## Schemas

```ts
s.string
s.string("description")
s.number
s.boolean
s.unknown
s.array(item, "description")
s.object(fields, "description")
s.record(value, "description")
s.enum(...values)
s.enum(values, "description")
s.optional(shape)
s.optional(shape, "description")
```

Use declarative `s.*` helpers for every schema node.
Implicit object literals, trailing-underscore optional fields, and `{"*": ...}` record sugar are not supported.

## Shell intents

Shell and file intents are optimized for sandboxed agentic workflows. They assume the harness is already running with the required constraints and protections, so the generated instructions tell the agent to execute the action directly instead of adding extra permission prompts.

```ts
p.bash("git status --short")
p.result("npm test")
p.read("README.md")
p.write("README.md", "# Updated\n")

const reviewWorkspace = agent({
  name: "reviewWorkspace",
  instructions: p`Review ${p.read("README.md")} against ${p.bash("git status --short")}.`,
});
```

## Evaluating agentic performance

Use these samples to quickly gauge how well `rig` supports increasingly agentic workflows:

- `skills/rig/samples/20-issue-reproducer.md` — chained diagnose/fix flow
- `skills/rig/samples/36-subagent-delegation.md` — delegation between focused agents
- `skills/rig/samples/47-shell-intents.md` — shell/file intents embedded directly in prompt templates
- `skills/rig/samples/50-end-to-end-release-agent.md` — multi-step release planning workflow

## Agent behavior

- Default model: `gpt-4.1`
- Default max turns: `4`
- No addons are loaded by default (including repair/retry behavior)

Per call, you can override `model`, `timeout`, `maxTurns`, and `signal`.

## Addons

Each agent call runs a per-turn addon chain:

```ts
const steerFinalTurn = async (context, next) => {
  await next();
  if (context.nextPrompt && context.turn === context.maxTurns - 1) {
    context.nextPrompt = `${context.nextPrompt}\nYou are running out of turns. Return corrected JSON now.`;
  }
};

const review = agent({
  name: "review",
  maxTurns: 3,
  addon: steerFinalTurn,
});
```

`context` includes `prompt`, `response`, `turn`, `maxTurns`, `signal`, `output`, `nextPrompt`, `error`, and `completed`.

For the common retry flow with last-turn steering or stable default timeouts, opt into addons:

```ts
const review = agent({
  name: "review",
  maxTurns: 3,
  addon: [timeout({ timeout: 30_000 }), steering(), repair],
});
```

For direct SDK access, addons also expose `context.session`:

```ts
const onSessionEvent = async (context, next) => {
  if (context.turn === 1) {
    context.session.on?.((event) => {
      // custom event handling
    });
  }
  await next();
};

const review = agent({
  name: "review",
  addon: onSessionEvent,
});
```

You can also register addons after creating the agent:

```ts
const timingAddon = async (context, next) => {
  await next();
};

const review = agent({ name: "review" });
review.use(timingAddon);
```

## Copilot SDK runtime

`rig` is specialized for Copilot SDK sessions inside sandboxed agentic workflows.

By default it connects to an already-running Copilot server via HTTP (`COPILOT_SDK_URI`, then `localhost:7777`).
Pass `--server` to spawn the server over stdio when launching a program.
Run `node skills/rig/rig.ts --help` for CLI usage; the launcher also accepts common help aliases such as `-h`, `help`, `/help`, and `/?`.

For runnable programs, you can pipe a rig program directly on stdin (assumes the Copilot server is already running):

```bash
cat <<'RIG' | node skills/rig/rig.ts
const root = agent({
  name: "review",
  instructions: "Summarize this repository.",
});
export default root;
RIG
```

Inline stdin programs run a root agent with no required external input and write the result to stdout. If `export default` is omitted, the harness defaults to the first `const/let/var name = agent(...)` assignment.  
`import { agent, p, s } from "rig"` is optional in inline mode because the harness injects it when missing.

Inline mode accepts root agents that either omit `input`, use `input: s.object({})`, or rely on the default `input: s.string` (which is invoked with `""`).

Pass `--server` to start the Copilot server automatically as part of the run:

```bash
cat ./program.ts | node skills/rig/rig.ts --server
```

Pass `--typecheck` to typecheck the rig program before execution:

```bash
cat ./program.ts | node skills/rig/rig.ts --typecheck
```

To run a root agent from a program file, export the root agent as the default export and pass input on stdin:

```bash
echo "Summarize this repository" | node skills/rig/rig.ts src/program.ts
```

Program-file mode also supports `--typecheck`:

```bash
echo "Summarize this repository" | node skills/rig/rig.ts src/program.ts --typecheck
```

For program-file mode stdin coercion:
- if root input schema is `string`, stdin is passed as raw text
- if root input schema is an object containing `text`, stdin is passed as `{ text: "<stdin>" }`
- otherwise stdin must be valid JSON for the declared input schema

Copilot SDK lifecycle events and rig request events are logged to stderr as JSONL.

## Local development

```bash
npm test
npm run typecheck
```
