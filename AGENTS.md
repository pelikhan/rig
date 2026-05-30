# AGENTS.md

## Project Overview

Rig is a minimal TypeScript agent harness. The core runtime (`skills/rig/rig.ts`) provides declarative agent construction with typed input/output shapes, shell intents, and a pluggable LLM engine. The Copilot SDK engine lives in a sibling module.

## Architecture

```
skills/rig/rig.ts      — Core runtime (agent, sh, p, validate, useEngine, schemas)
skills/rig/samples/    — 51 sample agents demonstrating patterns
src/engines/copilot.ts — Copilot SDK engine (rig/engines/copilot)
src/rig.test.ts        — Unit tests (vitest)
scripts/run-sample.test.ts — Sample runner with a stub engine (dry-run)
skills/rig/SKILL.md    — Framework reference docs
```

All imports use the `"rig"` path alias (resolved via tsconfig paths + vitest alias). Submodules are imported as `rig/engines/copilot`.

## Commands

| Task | Command |
|------|---------|
| Typecheck | `npm run typecheck` |
| Unit tests | `npm test` |
| Run samples (stub) | `npm run sample` |
| Run single sample (stub) | `RIG_SAMPLE=02 npm run sample` |
| Run a sample for real | `echo "<input>" \| node skills/rig/rig.ts <program-file>` (`npm run sample:run`) |

## Code Style

- Keep the core (`skills/rig/rig.ts`) self-contained and free of runtime dependencies
- Only `@github/copilot-sdk` is allowed, and only inside `src/engines/copilot.ts`
- Engines live in their own files, not in the core
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
- **Shell intents (`p.*`)**: `p.bash(cmd)`, `p.result(cmd)`, `p.read(path)`, `p.write(path, content)` — declarative placeholders resolved by the engine, not executed in-process
- **Event subscription**: `myAgent.subscribe(listener)` — observe `call`, `send`, `response`, `result`, `error` events without wrapping — analogous to pi-agent's `Agent.subscribe()`
- **Prompts**: `p\`...\`` template tag composes instructions with inline `p.*` helpers
- **Engine**: Pluggable via `useEngine(engine)`. There is no implicit default — opt in with `useEngine(copilotEngine())` from `rig/engines/copilot`, or supply your own `{ createSession({ model }) => { send(prompt, { signal }) } }`.
- **Repair**: `repair: "default"` (or a custom `(error) => string`) re-prompts on parse/validation failure up to `maxTurns`. Disable with `repair: false`.

## Sample guide

- `20-issue-reproducer.ts` — chained diagnosis, fix planning, and review
- `36-subagent-delegation.ts` — focused-agent delegation
- `47-shell-intents.ts` — shell intent primitives
- `50-end-to-end-release-agent.ts` — end-to-end release workflow orchestration
- `51-extensibility.ts` — lifecycle tracing for measuring behavior
