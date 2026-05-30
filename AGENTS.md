# AGENTS.md

## Project Overview

Rig is a minimal TypeScript agent harness. The core runtime (`src/rig.ts`) provides declarative agent construction with typed input/output shapes, shell intents, and a pluggable LLM engine. Optional middleware and the Copilot SDK engine live in sibling modules.

## Architecture

```
src/rig.ts             — Core runtime (agent, sh, p, validate, useEngine, schemas)
src/middleware.ts      — Optional middleware wrappers (rig/middleware)
src/engines/copilot.ts — Copilot SDK engine (rig/engines/copilot)
src/rig.test.ts        — Unit tests (vitest)
src/samples/           — 49 sample agents demonstrating patterns
scripts/run-sample.test.ts — Sample runner with a stub engine (dry-run)
src/launcher.ts        — Launcher API + CLI entrypoint
skills/rig/SKILL.md    — Framework reference docs
```

All imports use the `"rig"` path alias (resolved via tsconfig paths + vitest alias). Submodules are imported as `rig/middleware` and `rig/engines/copilot`.

## Commands

| Task | Command |
|------|---------|
| Typecheck | `npm run typecheck` |
| Unit tests | `npm test` |
| Run samples (stub) | `npm run sample` |
| Run single sample (stub) | `RIG_SAMPLE=02 npm run sample` |
| Run a sample for real | `npx tsx src/launcher.ts <program-file>` (`npm run sample:run`) |

## Code Style

- Keep the core (`src/rig.ts`) self-contained and free of runtime dependencies
- Only `@github/copilot-sdk` is allowed, and only inside `src/engines/copilot.ts`
- Middleware and engines live in their own files, not in the core
- Minimal comments; code should be self-explanatory
- Use `node:` prefix for Node.js built-in imports
- Types are colocated with the module that defines them, not in separate `.d.ts` files
- Trailing underscore on object keys (`key_`) means optional field
- Do not add legacy compatibility bridges; update callers, samples, and docs to the current API

## Testing

- Framework: vitest
- Tests live in `src/rig.test.ts` (18 tests covering agent definition, invocation, validation, and shell intents)
- Stub the LLM with a local `mockEngine(response)` helper or inline `useEngine({ createSession: ... })`
- All unit tests must pass before committing
- Samples run via a stub engine that synthesizes shape-conforming output from the prompt's `<output_schema>` block

## Key Concepts

- **Shape descriptors**: JS values used as type exemplars (e.g., `""` = string, `0` = number, `[""]` = string array). Promoted to schemas via `SchemaLike`.
- **Schema helpers (`s.*`)**: `s.string`, `s.number`, `s.boolean`, `s.unknown`, `s.array`, `s.object`, `s.record`, `s.enum`, `s.literal`, `s.nullable`, `s.optional`
- **Shell intents (`sh.*`)**: `sh.text(cmd)` / `sh.shell(cmd)` (alias used inside `p\`\``), `sh.result(cmd)`, `sh.read(path)`, `sh.write(path, content)` — declarative placeholders resolved by the engine, not executed in-process
- **Custom intents**: Extend the intent system via `CustomIntents` declaration merging + `registerIntentRenderer(namespace, fn)` — analogous to pi-agent's `CustomAgentMessages`
- **Event subscription**: `myAgent.subscribe(listener)` — observe `call`, `send`, `response`, `result`, `error` events without wrapping — analogous to pi-agent's `Agent.subscribe()`
- **Prompts**: `p\`...\`` template tag composes instructions with inline `sh.*` helpers
- **Engine**: Pluggable via `useEngine(engine)`. There is no implicit default — opt in with `useEngine(copilotEngine())` from `rig/engines/copilot`, or supply your own `{ createSession({ model }) => { send(prompt, { signal }) } }`.
- **Repair**: `repair: "default"` (or a custom `(error) => string`) re-prompts on parse/validation failure up to `maxTurns`. Disable with `repair: false`.
- **Middleware** (optional, from `rig/middleware`): wraps agents and engines with lifecycle hooks; contexts are `{ kind: "agent" | "engine", event: "call" | "send" | "result" | "error", ... }`.
