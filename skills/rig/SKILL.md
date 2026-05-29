# rig samples

This directory contains 50 TypeScript examples for the minimal `rig` agent harness.

The samples intentionally use only the compact public API:

```ts
import { agent, sh } from "rig";
```

`sh.text`, `sh.result`, and `sh.write` create declarative prompt intents. They do not execute in the framework. The underlying agentic engine is responsible for resolving those intents.

## Index

- [`01-summarize-text.ts`](./01-summarize-text.ts) — summarize text.
- [`02-review-git-diff.ts`](./02-review-git-diff.ts) — review git diff.
- [`03-diagnose-test-failure.ts`](./03-diagnose-test-failure.ts) — diagnose test failure.
- [`04-generate-readme.ts`](./04-generate-readme.ts) — generate readme.
- [`05-write-readme-intent.ts`](./05-write-readme-intent.ts) — write readme intent.
- [`06-list-source-files.ts`](./06-list-source-files.ts) — list source files.
- [`07-summarize-many-files.ts`](./07-summarize-many-files.ts) — summarize many files.
- [`08-extract-package-scripts.ts`](./08-extract-package-scripts.ts) — extract package scripts.
- [`09-classify-issue.ts`](./09-classify-issue.ts) — classify issue.
- [`10-triage-pr.ts`](./10-triage-pr.ts) — triage pr.
- [`11-release-notes.ts`](./11-release-notes.ts) — release notes.
- [`12-security-scan-review.ts`](./12-security-scan-review.ts) — security scan review.
- [`13-test-plan.ts`](./13-test-plan.ts) — test plan.
- [`14-changelog-categorizer.ts`](./14-changelog-categorizer.ts) — changelog categorizer.
- [`15-api-diff-summary.ts`](./15-api-diff-summary.ts) — api diff summary.
- [`16-docs-gap-analysis.ts`](./16-docs-gap-analysis.ts) — docs gap analysis.
- [`17-refactor-plan.ts`](./17-refactor-plan.ts) — refactor plan.
- [`18-patch-writer-output.ts`](./18-patch-writer-output.ts) — patch writer output.
- [`19-fix-then-review.ts`](./19-fix-then-review.ts) — fix then review.
- [`20-issue-reproducer.ts`](./20-issue-reproducer.ts) — issue reproducer.
- [`21-ci-log-diagnosis.ts`](./21-ci-log-diagnosis.ts) — ci log diagnosis.
- [`22-config-normalizer.ts`](./22-config-normalizer.ts) — config normalizer.
- [`23-schema-inference.ts`](./23-schema-inference.ts) — schema inference.
- [`24-error-message-improver.ts`](./24-error-message-improver.ts) — error message improver.
- [`25-migration-guide.ts`](./25-migration-guide.ts) — migration guide.
- [`26-design-review.ts`](./26-design-review.ts) — design review.
- [`27-dependency-upgrade-plan.ts`](./27-dependency-upgrade-plan.ts) — dependency upgrade plan.
- [`28-license-check.ts`](./28-license-check.ts) — license check.
- [`29-bug-report-draft.ts`](./29-bug-report-draft.ts) — bug report draft.
- [`30-github-action-review.ts`](./30-github-action-review.ts) — github action review.
- [`31-monorepo-package-map.ts`](./31-monorepo-package-map.ts) — monorepo package map.
- [`32-command-planner.ts`](./32-command-planner.ts) — command planner.
- [`33-readonly-investigator.ts`](./33-readonly-investigator.ts) — readonly investigator.
- [`34-intent-options.ts`](./34-intent-options.ts) — intent options.
- [`35-call-options.ts`](./35-call-options.ts) — call options.
- [`36-subagent-delegation.ts`](./36-subagent-delegation.ts) — subagent delegation.
- [`37-output-with-nullable.ts`](./37-output-with-nullable.ts) — output with nullable.
- [`38-exact-literal-output.ts`](./38-exact-literal-output.ts) — exact literal output.
- [`39-unknown-raw-output.ts`](./39-unknown-raw-output.ts) — unknown raw output.
- [`40-record-output.ts`](./40-record-output.ts) — record output.
- [`41-permissioned-agent.ts`](./41-permissioned-agent.ts) — permissioned agent.
- [`42-json-repair.ts`](./42-json-repair.ts) — json repair.
- [`43-snapshot-test-updater.ts`](./43-snapshot-test-updater.ts) — snapshot test updater.
- [`44-flaky-test-analysis.ts`](./44-flaky-test-analysis.ts) — flaky test analysis.
- [`45-code-owner-suggestion.ts`](./45-code-owner-suggestion.ts) — code owner suggestion.
- [`46-prompt-intent-inspection.ts`](./46-prompt-intent-inspection.ts) — prompt intent inspection.
- [`47-validate-output.ts`](./47-validate-output.ts) — validate output.
- [`48-custom-engine.ts`](./48-custom-engine.ts) — custom engine.
- [`49-timeout-signal-helper.ts`](./49-timeout-signal-helper.ts) — timeout signal helper.
- [`50-end-to-end-release-agent.ts`](./50-end-to-end-release-agent.ts) — end to end release agent.
