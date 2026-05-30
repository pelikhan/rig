# Rig syntax review

This review covers the current rig syntax as expressed in:

- `src/rig.ts`
- `skills/rig/SKILL.md`
- all sample programs in `src/samples/`

## Current state

Rig supports two schema declaration styles:

- shorthand object/array/primitive schemas for common cases
- explicit `s.*` helpers for the full schema surface

The runtime now accepts shorthand object literals, trailing-underscore optional fields, `{"*": ...}` record sugar, single-item array syntax, and literal array enums alongside explicit `s.*` helpers.

## What works well

1. **Simple defaults for common LLM contracts.** Small output objects can be declared with plain JS syntax.
2. **Explicit escape hatch.** `s.*` remains available for `unknown`, `nullable`, and more complex composition.
3. **Consistent runtime contract.** Prompt rendering still emits `<instructions>`, `<output_schema>`, `<input>`, and `<rules>`, with optional `<permissions>` and `<subagents>` blocks.
4. **Better failure mode for invalid declarations.** Runtime validation still rejects malformed shorthand with a clear error.

## Remaining guidance

1. Prefer shorthand for small schemas, but keep using `s.*` when it reads better.
2. Use trailing `_` for optional shorthand fields or `s.optional(...)` when staying in explicit mode.
3. Treat `skills/rig/SKILL.md` and the early samples as the canonical starting points for generated code.
4. Continue keeping the runnable sample corpus green so checked-in examples stay trustworthy.

## Validation

- `npm test`
- `npm run typecheck`
- `npm run sample`
