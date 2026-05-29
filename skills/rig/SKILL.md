# rig

Minimal TypeScript agent harness. Source: `src/rig.ts`. Samples: `src/samples/`.

```ts
import { agent, sh } from "rig";
```

## API

- `agent(name, opts?)` — declare an agent with typed input/output shapes, instructions, permissions, subagents.
- `sh.text(cmd)` / `sh.result(cmd)` / `sh.write(path, contents)` — declarative shell intents resolved by the engine.
- `agent.enum(values)` / `agent.literal(v)` / `agent.nullable(shape)` / `agent.unknown()` — output type markers.
- `validate(value, shape)` — runtime shape validation.
- `collectIntents(input)` — extract `sh` intents from nested input for prompt rendering.
- `useEngine(engine)` — inject a custom `Engine` (default: Copilot SDK).

## Project layout

```
src/rig.ts          — library (single file)
src/samples/*.ts    — 50 usage examples
src/rig.test.ts     — vitest tests
tsconfig.json       — paths: { "rig": ["./src/rig.ts"] }
vitest.config.ts    — alias: { rig: "src/rig.ts" }
```

## Commands

```sh
npm test        # vitest run
npm run typecheck  # tsc --noEmit
```
