# Rig syntax review

This review scores the **50 existing sample harnesses** in `src/samples/02-51` as examples of current rig syntax.

## Scoring rubric

- **Solution quality**: how well the sample demonstrates a useful agentic harness pattern.
- **Naturalness**: how likely an agent is to reproduce the pattern correctly without extra coaching.
- Scale: `1` weak, `3` acceptable, `5` exemplary.

## Summary

- **Overall solution quality:** `3.7 / 5`
- **Overall naturalness:** `3.4 / 5`
- **Most agent-friendly patterns:** explicit `s.*` schemas, short `agent({ ... })` specs, inline `sh.*` inputs, small focused outputs.
- **Least agent-friendly patterns:** shorthand objects with `_` suffixed optional fields, advanced options that are absent from the skill doc, and examples that rely on implicit schema sugar without naming it.

## What the current syntax does well

1. `agent({ name, instructions, input, output })` is small and memorable.
2. `sh.text`, `sh.result`, `sh.read`, and `sh.write` read naturally inside inputs and `p\`\`` templates.
3. `s.object`, `s.enum`, `s.literal`, `s.nullable`, and `s.record` make structured outputs easy to validate.
4. Call-time overrides such as `timeout`, `model`, `maxTurns`, and `signal` are compact.
5. `permissions` and `agents` make advanced harnesses possible without changing the core API.

## Where agents are likely to drift

1. The shorthand schema form is powerful but underexplained.
2. `_` suffixed keys mean **optional** keys in shorthand objects, but that rule is hidden in implementation details.
3. `permissions`, `agents`, `collectIntents`, and call-time options are real syntax, but they are not surfaced clearly enough in the skill doc.
4. Samples mix shorthand schemas and explicit `s.*` schemas without telling the reader which style is preferred.
5. Some sample names are stronger than the code they currently contain, so an agent can overgeneralize from the filename instead of the actual pattern.

## Recommendations to make rig more agent-friendly

1. **Prefer explicit schemas in teaching docs.** Use `s.object(...)` as the default teaching style and present shorthand schemas as sugar.
2. **Document shorthand rules directly.** Spell out that `field_: value` becomes an optional field named `field`.
3. **Show one recommended template first.** Teach one “good default” agent shape before presenting variants.
4. **Separate spec-time from call-time options.** Put `timeout`, `model`, `maxTurns`, and `signal` into their own section.
5. **Promote advanced fields into the main spec table.** Include `permissions` and `agents` alongside `name`, `instructions`, `input`, and `output`.
6. **Call out anti-patterns.** Tell agents not to mix implicit sugar and explicit schemas unless there is a reason.
7. **Bias examples toward structured outputs.** Small typed outputs are easier for agents to mimic than raw prose-only agents.

## Scenario scores

| # | Sample | Scenario | Solution | Naturalness | Notes |
|---|--------|----------|----------|-------------|-------|
| 02 | `02-review-git-diff.ts` | Diff review with optional line numbers | 4 | 4 | Strong structured review output. |
| 03 | `03-diagnose-test-failure.ts` | Test failure diagnosis | 3 | 2 | `_` optional-field sugar is useful but underdocumented. |
| 04 | `04-generate-readme.ts` | README generation | 3 | 3 | Natural task, light schema pressure. |
| 05 | `05-write-readme-intent.ts` | File write intent generation | 3 | 2 | `s.literal` is good; write-intent framing needs coaching. |
| 06 | `06-list-source-files.ts` | Source file inventory with permissions | 3 | 2 | Realistic, but `permissions` is not taught clearly. |
| 07 | `07-summarize-many-files.ts` | Multi-file summarization | 3 | 3 | Useful batch summarization pattern. |
| 08 | `08-extract-package-scripts.ts` | Package script extraction | 4 | 4 | Compact and easy to imitate. |
| 09 | `09-classify-issue.ts` | Issue classification | 5 | 5 | Best beginner sample; simple task and crisp enums. |
| 10 | `10-triage-pr.ts` | PR triage | 4 | 4 | Strong real-world workflow shape. |
| 11 | `11-release-notes.ts` | Release note drafting | 4 | 3 | Useful, but prose-heavy outputs are less constrained. |
| 12 | `12-security-scan-review.ts` | Security scan review | 3 | 2 | `_` sugar makes this less discoverable. |
| 13 | `13-test-plan.ts` | Regression test planning | 4 | 3 | Good planning harness; moderate structure. |
| 14 | `14-changelog-categorizer.ts` | Changelog categorization | 4 | 4 | Clear categorical output. |
| 15 | `15-api-diff-summary.ts` | API diff summarization | 4 | 3 | Good pattern, moderate schema ambiguity. |
| 16 | `16-docs-gap-analysis.ts` | Documentation gap analysis | 4 | 3 | Useful review pattern, moderate naturalness. |
| 17 | `17-refactor-plan.ts` | Refactor planning | 4 | 3 | Common harness, but structure could be stricter. |
| 18 | `18-patch-writer-output.ts` | Patch payload generation | 4 | 3 | Valuable but more specialized. |
| 19 | `19-fix-then-review.ts` | Fix and review workflow | 4 | 4 | Good compound workflow; `permissions` is meaningful. |
| 20 | `20-issue-reproducer.ts` | Repro step generation | 4 | 3 | Good developer task framing. |
| 21 | `21-ci-log-diagnosis.ts` | CI log diagnosis | 4 | 3 | Strong scenario, slightly verbose pattern. |
| 22 | `22-config-normalizer.ts` | Config normalization | 4 | 3 | Good typed transform example. |
| 23 | `23-schema-inference.ts` | Schema inference | 4 | 4 | Clear advanced use of `s.unknown`. |
| 24 | `24-error-message-improver.ts` | Error message improvement | 3 | 2 | `s.unknown` plus prose output is easy to miscopy. |
| 25 | `25-migration-guide.ts` | Migration guide writing | 3 | 3 | Practical, but shorthand optional syntax is opaque. |
| 26 | `26-design-review.ts` | Design review | 4 | 4 | Strong analysis harness shape. |
| 27 | `27-dependency-upgrade-plan.ts` | Dependency upgrade plan | 4 | 3 | Good practical workflow. |
| 28 | `28-license-check.ts` | License review | 3 | 3 | Fine reference sample. |
| 29 | `29-bug-report-draft.ts` | Bug report drafting | 3 | 3 | Natural task, moderate schema value. |
| 30 | `30-github-action-review.ts` | GitHub Action review | 4 | 3 | Useful, but domain-specific. |
| 31 | `31-monorepo-package-map.ts` | Monorepo package mapping | 4 | 3 | Good inventory pattern. |
| 32 | `32-command-planner.ts` | Command planning | 4 | 3 | Useful planning harness with moderate structure. |
| 33 | `33-readonly-investigator.ts` | Readonly investigation | 4 | 3 | Good controlled-agent pattern. |
| 34 | `34-intent-options.ts` | Intent options and permissions | 4 | 3 | Important syntax, but not documented enough. |
| 35 | `35-call-options.ts` | Call option overrides | 4 | 3 | Good feature coverage; should be in the skill guide. |
| 36 | `36-subagent-delegation.ts` | Subagent delegation | 4 | 3 | Valuable advanced pattern; concept needs explanation. |
| 37 | `37-output-with-nullable.ts` | Subagent-aware reviewer | 5 | 4 | `agents` is compact and powerful. |
| 38 | `38-exact-literal-output.ts` | Literal and nullable output | 5 | 5 | Excellent example of precise extraction. |
| 39 | `39-unknown-raw-output.ts` | Raw structured payload | 4 | 4 | Clear example of `s.literal` and `s.unknown`. |
| 40 | `40-record-output.ts` | Record-shaped output | 4 | 4 | Strong `s.record` example. |
| 41 | `41-permissioned-agent.ts` | Record output with optional notes | 3 | 3 | Good record pattern, but optional-key sugar is hidden. |
| 42 | `42-json-repair.ts` | Repair and retry | 5 | 4 | Important behavior and easy to justify. |
| 43 | `43-snapshot-test-updater.ts` | Snapshot update planning | 3 | 3 | Useful but more task-specific. |
| 44 | `44-flaky-test-analysis.ts` | Flaky test analysis | 3 | 2 | Optional shorthand keys reduce readability. |
| 45 | `45-code-owner-suggestion.ts` | Code owner suggestion | 3 | 3 | Fine reference example. |
| 46 | `46-prompt-intent-inspection.ts` | Prompt and intent inspection | 4 | 4 | Strong introspection sample. |
| 47 | `47-validate-output.ts` | Intent collection and validation | 5 | 4 | Excellent advanced sample. |
| 48 | `48-custom-engine.ts` | Custom engine wiring | 5 | 4 | Strong systems-level example. |
| 49 | `49-timeout-signal-helper.ts` | Timeout and abort handling | 4 | 3 | Good operational pattern. |
| 50 | `50-end-to-end-release-agent.ts` | Timeout/abort minimal flow | 4 | 4 | Small and memorable, though narrower than the filename suggests. |
| 51 | `51-extensibility.ts` | Custom intents and lifecycle events | 5 | 5 | Best advanced sample; captures the API direction well. |

## Distilled guidance for `SKILL.md`

The skill file should teach this order:

1. Start with one explicit `agent({ ... })` template.
2. Show explicit `s.object(...)` schemas as the default.
3. Introduce shorthand schemas as optional sugar.
4. Explain `_` suffixed optional keys immediately when shorthand appears.
5. Add shell intents next.
6. Add `permissions`, `agents`, and call-time overrides after the core path.
7. End with extensibility and validation helpers.

That ordering matches what the current samples reward and reduces the chance that an agent invents unsupported syntax.
