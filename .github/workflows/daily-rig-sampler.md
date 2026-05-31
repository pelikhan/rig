---
name: Daily Rig Sampler
description: >
  Each day, pick one rig sample (cached round-robin) from src/samples/,
  read it alongside skills/rig/rig.ts, and apply one focused quick-win
  improvement to skills/rig/rig.ts in a new draft PR.
on:
  schedule: daily
  workflow_dispatch:
permissions:
  contents: read
  actions: read
  issues: read
  pull-requests: read
engine: copilot
strict: true
timeout-minutes: 20
tools:
  github:
    mode: gh-proxy
    toolsets: [default]
  bash: ["*"]
  edit:
  cache-memory: true
network:
  allowed: [defaults, github, node]
safe-outputs:
  create-pull-request:
    title-prefix: "[rig-sampler] "
    labels: [automation, ai-agent]
    draft: true
    reviewers: [copilot]
    allowed-files:
      - "skills/rig/rig.ts"
---

## Task

You are improving the rig TypeScript harness one focused change at a time.

### Step 1 — Pick the next sample (cached round-robin)

1. Run `ls src/samples/` to list all sample files sorted alphabetically.
2. Open the cache-memory file `/tmp/gh-aw/cache-memory/last-sample.json`.
   - If it does not exist, start from the first file.
   - Otherwise read the `lastFile` field and advance to the next file in the sorted list (wrapping around).
3. Write `{"lastFile": "<chosen-file>"}` back to `/tmp/gh-aw/cache-memory/last-sample.json`.
4. Note the chosen sample file (e.g. `src/samples/05-write-readme-intent.ts`).

### Step 2 — Read the sample and rig.ts

Read the chosen sample file and `skills/rig/rig.ts` in full.

### Step 3 — Identify one quick-win improvement

Analyze how the chosen sample uses the rig API and identify **exactly one** small, self-contained improvement to `skills/rig/rig.ts` that would make rig better.

Good quick-win categories (pick one):
- A missing `s.*` schema helper that would simplify sample code.
- A clearer error message in validation or repair logic.
- A JSDoc comment on a public export that is currently undocumented.
- A small type-safety improvement (stricter overload, narrower generic).
- A minor performance tweak with no behaviour change.

Do **not** change the public API in a breaking way. Keep the change small and reviewable.

### Step 4 — Apply the improvement

Edit `skills/rig/rig.ts` to implement the improvement. Use the `edit` tool.

### Step 5 — Create a pull request

Emit a `create-pull-request` output with:
- `title`: one-line description of the improvement (no prefix needed — it is added automatically).
- `body`: explain which sample triggered the idea and why this change improves the harness.
- `branch`: `rig-sampler/<chosen-sample-basename>` (e.g. `rig-sampler/05-write-readme-intent`).
