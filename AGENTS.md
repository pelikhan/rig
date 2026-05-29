# AGENTS.md

## Project Overview

Rig is a minimal TypeScript agent harness. The entire runtime is a single file (`src/rig.ts`) that provides declarative agent construction with typed input/output shapes, shell intents, middleware, and LLM engine abstraction.

## Architecture

```
src/rig.ts          — Full runtime (agent, sh, validate, engine, logging)
src/rig.test.ts     — Unit tests (vitest)
src/samples/        — 50 sample agents demonstrating patterns
scripts/            — Sample runner (stub engine for dry-run testing)
skills/rig/SKILL.md — Framework reference docs
```

All imports use the `"rig"` path alias (resolved via tsconfig paths + vitest alias).

## Commands

| Task | Command |
|------|---------|
| Typecheck | `npm run typecheck` |
| Unit tests | `npm test` |
| Run samples (stub) | `npm run sample` |
| Run single sample | `RIG_SAMPLE=02 npm run sample` |

## Code Style

- Single file architecture — keep `src/rig.ts` self-contained
- No external runtime dependencies (only `@github/copilot-sdk` for the default engine)
- Minimal comments; code should be self-explanatory
- Use `node:` prefix for Node.js built-in imports
- Types are colocated in `src/rig.ts`, not in separate `.d.ts` files
- Trailing underscore on object keys (`key_`) means optional field
- Do not add legacy compatibility bridges; update callers, samples, and docs to the current API

## Logging

JSONL logger built-in. Enabled via `RIG_LOG=1` or `RIG_DEBUG=1`. Outputs to stderr:

```json
{"ts":1717000000000,"ns":"rig:agent-name:engine","msg":"send turn=1 prompt_len=482"}
```

## Testing

- Framework: vitest
- Tests live in `src/rig.test.ts`
- Use `mockEngine(response)` or inline `useEngine(...)` to stub the LLM
- All unit tests must pass before committing
- Samples run via a stub engine that generates shape-conforming output from the prompt's `<output_schema>`

## Key Concepts

- **Shape descriptors**: JS values used as type exemplars (e.g., `""` = string, `0` = number, `[""]` = string array)
- **Schema helpers**: `s.enum()`, `s.literal()`, `s.nullable()`, `s.optional()`, `s.unknown`
- **Shell intents**: `sh.text()`, `sh.result()`, `sh.read()`, `sh.write()` — declarative placeholders resolved by the engine, not executed in-process
- **Custom intents**: Extend the intent system via `CustomIntents` declaration merging + `registerIntentRenderer(namespace, fn)` — analogous to pi-agent's `CustomAgentMessages`
- **Event subscription**: `myAgent.subscribe(listener)` — observe `call`, `send`, `response`, `result`, `error` events without wrapping — analogous to pi-agent's `Agent.subscribe()`
- **Middleware**: Optional wrappers in `rig/middleware`; `withMiddleware(agent, [...])` for interception
- **Engine**: Pluggable via `useEngine()`; default uses `@github/copilot-sdk`
