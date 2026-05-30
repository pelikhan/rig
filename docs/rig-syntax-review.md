# Rig syntax review

This review covers the current rig syntax as expressed in:

- `src/rig.ts`
- `skills/rig/SKILL.md`
- all 50 sample programs in `src/samples/` (`02` through `51`)

## Overall score

**Correct-generation score: `7.0 / 10`**

Why it is above average:

- `rig.ts` exposes a very small, regular surface area: `agent(...)`, `s.*`, `p.*`, `useEngine(...)`, call options, and lifecycle events.
- `SKILL.md` teaches a clear canonical pattern and a good generation checklist.
- the runtime prompt contract is stable and easy to reason about.

Why it is not higher:

- the sample corpus does not reinforce the canonical style strongly enough.
- most samples use shorthand schema literals, while the skill teaches explicit `s.object(...)`.
- many sample filenames no longer match the program body, which makes retrieval-by-filename unreliable for agents.
- `npm run sample` currently has four failing samples, so the runnable corpus is not fully trustworthy as a training set.

## Evidence snapshot

- total samples reviewed: **50**
- samples using explicit `s.object(...)` input schemas: **5**
- samples using explicit `s.object(...)` output schemas: **6**
- samples using shorthand object-literal schemas: **40**
- samples using `p.*` shell/file placeholders: **34**
- samples using `permissions`: **4**
- samples using `agents`: **1**
- samples using `p\`...\`` templates: **1**
- samples using `.subscribe(...)`: **1**

## `src/rig.ts` review

### What works well

1. **Small syntax surface.** `agent`, `s`, `p`, `useEngine`, and call-time overrides are enough to express most programs.
2. **Consistent runtime contract.** The prompt renderer always emits `<instructions>`, `<output_schema>`, `<input>`, and `<rules>`, with optional `<permissions>` and `<subagents>` blocks.
3. **Useful schema normalization.** `normalizeSchema()` lets authors use explicit `s.*` helpers or shorthand object/array/literal forms.
4. **Advanced features stay composable.** `permissions`, `agents`, `repair`, and lifecycle subscriptions layer on top of the same base syntax.
5. **Defaults are pragmatic.** `agent()` defaults `model` to `gpt-4.1`, `maxTurns` to `4`, and falls back to `copilotEngine()` when no engine was installed explicitly.

### Agentic friction points

1. **Two valid schema styles compete.** The runtime accepts both shorthand and explicit schemas, but only one can realistically become the agent's default habit.
2. **Some important behavior is implicit.** The auto-installed default engine and the exact rendered prompt shape are discoverable in `rig.ts`, not obvious from the samples alone.
3. **Optional-field sugar is terse but hidden.** The trailing-underscore rule is convenient for humans and easy for agents to miss.
4. **Advanced syntax is under-sampled.** `agents`, `subscribe`, `repair`, and prompt templates exist in the runtime, but the corpus gives them very little repetition.

## `skills/rig/SKILL.md` review

### Strengths

1. It teaches one canonical starting shape: `agent({ name, instructions, input, output })`.
2. It strongly prefers explicit `s.object(...)` + `s.*`, which is the most reproducible style for code generation.
3. It clearly separates spec-time fields from call-time overrides.
4. It documents `permissions`, `agents`, repair, prompt helpers, engines, and lifecycle events using the current public API.

### Gaps

1. The skill does not explicitly call out that the runtime also accepts shorthand schemas, so agents that learn from samples can see a style the skill does not frame.
2. The skill does not show the rendered prompt contract from `rig.ts`, even though that contract explains why some patterns are robust.
3. The skill is more canonical than the sample corpus, so the repository currently teaches two different defaults.
4. The skill does not mention that `agent()` falls back to `copilotEngine()` when no engine has been installed.

## Sample corpus review

### High-level findings

1. **The samples are valid syntax, but not a single canonical dialect.** The runtime-normalized shorthand dominates the corpus.
2. **Filename drift is now a real retrieval problem.** Examples:
   - `04-generate-readme.ts` contains a test-diagnosis harness.
   - `10-triage-pr.ts` contains issue classification.
   - `45-code-owner-suggestion.ts` contains flaky-test analysis.
   - `46-prompt-intent-inspection.ts` contains code-owner suggestion.
   - `49-timeout-signal-helper.ts` demonstrates custom engine wiring.
   - `50-end-to-end-release-agent.ts` demonstrates timeout/abort handling.
3. **The corpus over-represents shorthand schemas and under-represents advanced syntax.** This makes beginner generation easy to start but harder to keep canonical.
4. **Runnable confidence is slightly degraded.** `npm run sample` currently fails for samples `43`-`46` under the stub runner because their required output shapes are stricter than the fallback repaired response.

### Per-sample syntax inventory

| # | Sample | Syntax profile | Agentic note |
|---|--------|----------------|--------------|
| 02 | `02-review-git-diff.ts` | explicit `s.object(...)` + `p.text(...)` | Best canonical starter sample. |
| 03 | `03-diagnose-test-failure.ts` | shorthand schemas + `p.text(...)` | Valid, but it teaches non-canonical sugar immediately. |
| 04 | `04-generate-readme.ts` | shorthand schemas + `p.result(...)` | Syntax is fine; filename/body mismatch hurts retrieval. |
| 05 | `05-write-readme-intent.ts` | shorthand + `s.literal(...)` + `p.text(...)` | Good literal example, still non-canonical overall. |
| 06 | `06-list-source-files.ts` | shorthand + `p.write(...)` + `permissions` | Useful write-intent sample, but filename/body mismatch hurts discoverability. |
| 07 | `07-summarize-many-files.ts` | explicit `s.object(...)` + `p.text(...)` | Strong canonical batch-analysis sample. |
| 08 | `08-extract-package-scripts.ts` | shorthand + `p.text(...)` | Simple and reusable, but again teaches shorthand first. |
| 09 | `09-classify-issue.ts` | explicit `s.object(...)` + enums | Excellent beginner sample. |
| 10 | `10-triage-pr.ts` | shorthand schemas | Clean syntax, misleading filename. |
| 11 | `11-release-notes.ts` | shorthand + `p.text(...)` | Useful pattern, filename/body drift continues. |
| 12 | `12-security-scan-review.ts` | shorthand + `p.text(...)` | Good review shape, but not aligned with the filename or canonical schema style. |
| 13 | `13-test-plan.ts` | shorthand + `p.text(...)` | Clear planning harness, but still sugar-heavy. |
| 14 | `14-changelog-categorizer.ts` | shorthand + `p.text(...)` | Same issue: valid but non-canonical. |
| 15 | `15-api-diff-summary.ts` | shorthand schemas | Small syntax footprint; filename/body mismatch persists. |
| 16 | `16-docs-gap-analysis.ts` | shorthand + `p.text(...)` | Good analysis harness, not a canonical schema exemplar. |
| 17 | `17-refactor-plan.ts` | shorthand + `p.text(...)` | Same pattern. |
| 18 | `18-patch-writer-output.ts` | shorthand + `p.text(...)` | Practical but still teaches the shorthand default. |
| 19 | `19-fix-then-review.ts` | shorthand + `p.text(...)` + `permissions` | Useful advanced permission hint; still non-canonical. |
| 20 | `20-issue-reproducer.ts` | shorthand + `p.text(...)` + `p.result(...)` + `permissions` | Good multi-intent sample, but filename/body mismatch remains. |
| 21 | `21-ci-log-diagnosis.ts` | shorthand schemas | Minimal syntax, but not strongly instructive. |
| 22 | `22-config-normalizer.ts` | shorthand + `p.text(...)` | Good transform shape, still shorthand-first. |
| 23 | `23-schema-inference.ts` | shorthand + `p.text(...)` + `s.unknown` | Strong advanced concept with non-canonical surface syntax. |
| 24 | `24-error-message-improver.ts` | shorthand + `p.text(...)` | Valid but generic. |
| 25 | `25-migration-guide.ts` | shorthand schemas | Straightforward, but not a syntax anchor. |
| 26 | `26-design-review.ts` | shorthand schemas | Same issue. |
| 27 | `27-dependency-upgrade-plan.ts` | shorthand schemas | Practical scenario with shorthand drift. |
| 28 | `28-license-check.ts` | shorthand + `p.text(...)` | Good command-fed input, non-canonical schema style. |
| 29 | `29-bug-report-draft.ts` | shorthand + `p.text(...)` | Useful but generic. |
| 30 | `30-github-action-review.ts` | shorthand + `p.text(...)` | Valid structure, filename/body mismatch still present. |
| 31 | `31-monorepo-package-map.ts` | shorthand + `p.text(...)` | Good inventory shape, still shorthand-led. |
| 32 | `32-command-planner.ts` | shorthand + `p.text(...)` | Clear planning shape, non-canonical. |
| 33 | `33-readonly-investigator.ts` | shorthand schemas | Small and valid, but not especially instructive. |
| 34 | `34-intent-options.ts` | shorthand + `p.text(...)` + `permissions` | Important feature coverage; needs canonical styling or stronger skill cross-linking. |
| 35 | `35-call-options.ts` | shorthand + `p.text(...)` | Good call-options scenario, but the file body no longer matches the name. |
| 36 | `36-subagent-delegation.ts` | default text input/output + call-time overrides | Good minimal example of defaults and per-call overrides. |
| 37 | `37-output-with-nullable.ts` | shorthand + `agents` + `p.text(...)` | Only subagent sample; highly valuable but under-repeated. |
| 38 | `38-exact-literal-output.ts` | shorthand + `s.literal(...)` + nullable-ish event parsing | Strong exact-output sample. |
| 39 | `39-unknown-raw-output.ts` | shorthand + `s.literal(...)` | Good structured extraction sample. |
| 40 | `40-record-output.ts` | shorthand + `p.text(...)` | Good raw-input sample, but not explicit enough for teaching. |
| 41 | `41-permissioned-agent.ts` | shorthand + `p.text(...)` | Helpful record-like output, filename/body mismatch hurts retrieval. |
| 42 | `42-json-repair.ts` | explicit `s.object(...)` + repair | Excellent advanced sample. |
| 43 | `43-snapshot-test-updater.ts` | shorthand + `s.unknown` | Useful repair target, but currently fails under `npm run sample`. |
| 44 | `44-flaky-test-analysis.ts` | shorthand + `p.result(...)` + `p.text(...)` | Practical diagnostic sample, also currently fails under `npm run sample`. |
| 45 | `45-code-owner-suggestion.ts` | shorthand + `p.text(...)` | Body is flaky-test analysis; mismatch plus sample-run failure reduces trust. |
| 46 | `46-prompt-intent-inspection.ts` | shorthand + `p.text(...)` | Body is code-owner suggestion; mismatch plus sample-run failure reduces trust. |
| 47 | `47-shell-intents.ts` | helper-only `p.text(...)` object | Good ultra-small reference for raw intents. |
| 48 | `48-custom-engine.ts` | explicit `s.object(...)` + `useEngine(...)` | Strong canonical systems sample. |
| 49 | `49-timeout-signal-helper.ts` | default text schema + `useEngine(...)` | Demonstrates engine wiring, not timeout/signal as the filename suggests. |
| 50 | `50-end-to-end-release-agent.ts` | default text schema + timeout + `AbortController` | Demonstrates abort handling, not release-agent orchestration. |
| 51 | `51-extensibility.ts` | `p\`...\`` + explicit output + `.subscribe(...)` | Best advanced sample for the current API direction. |

## Suggestions to improve agentic performance

1. **Make the sample corpus reinforce one default.** Convert the early teaching samples to explicit `s.object(...)` so the examples match `SKILL.md`.
2. **Fix filename/content drift.** Agents retrieve by filename and topic words; mismatched filenames actively teach the wrong association.
3. **Add an explicit "supported sugar vs preferred style" section to `SKILL.md`.** Say clearly that shorthand exists because `normalizeSchema()` accepts it, but generated code should prefer explicit `s.*`.
4. **Document the rendered prompt contract.** Show the `<instructions>`, `<output_schema>`, `<input>`, `<permissions>`, `<subagents>`, and `<rules>` blocks that `rig.ts` actually sends.
5. **Promote advanced syntax into dedicated canonical examples.** `permissions`, `agents`, `repair`, `p\`...\``, and `.subscribe(...)` should each have at least one obvious, accurately named sample.
6. **Keep the runnable corpus green.** Samples `43`-`46` should pass the stub runner so agents can trust that every checked-in example is executable.
7. **Add a short starter template to the repository root docs.** One small "copy this first" example would reduce drift more than many medium-complexity samples.

## Validation

- `npm test` ✅
- `npm run typecheck` ✅
- `npm run sample` ❌ (pre-existing failures in `43-snapshot-test-updater.ts`, `44-flaky-test-analysis.ts`, `45-code-owner-suggestion.ts`, and `46-prompt-intent-inspection.ts`)
