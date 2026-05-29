# rig

`rig` is a minimal harness for building reliable AI agents with a **genuinely intuitive syntax on top of JavaScript**.

It gives you:
- a tiny `agent(name, options)` API
- schema-first input/output definitions
- strict JSON output validation
- composable middleware for request/response lifecycle control
- declarative shell intents (`sh.text`, `sh.result`, `sh.write`)
- hooks for observability and control

## Goal

Make agent workflows feel like normal JavaScript:
- define input/output shapes inline
- call agents like regular async functions
- keep outputs structured and machine-safe
- avoid framework-heavy ceremony

## Quick example

```ts
import { agent, sh } from "rig";

const releaseAgent = agent("releaseAgent", {
  input: {
    status: "git status",
    tests: { ok: true, stdout: "", stderr: "", exitCode: 0 },
    commits: "recent commits",
    packageJson: "package metadata",
  },
  output: {
    ready: true,
    versionBump: agent.enum(["none", "patch", "minor", "major"]),
    notes: "release notes markdown",
    blockers: ["blocker"],
  },
  instructions: `
    Decide whether the repository is ready for release.
    Use test result, working tree status, commits, and package metadata.
  `,
});

const result = await releaseAgent({
  status: sh.text("git status --short"),
  tests: sh.result("npm test"),
  commits: sh.text("git log --oneline -30"),
  packageJson: sh.text("cat package.json"),
});
```

## Representative examples from `src/samples`

### 1) Typed issue classification (`src/samples/10-triage-pr.ts`)

```ts
import { agent } from "rig";

const classifyIssue = agent("classifyIssue", {
  input: { title: "Issue title", body: "Issue body" },
  output: {
    kind: agent.enum(["bug", "feature", "question", "chore"]),
    priority: agent.enum(["p0", "p1", "p2", "p3"]),
    rationale: "Short rationale",
    labels: ["label"],
  },
});
```

### 2) Agent composition (`src/samples/37-output-with-nullable.ts`)

```ts
import { agent } from "rig";

const summarizeDiff = agent("summarizeDiff", {
  input: { diff: "git diff" },
  output: { summary: "diff summary", files: ["file"] },
});

const reviewer = agent("reviewer", {
  input: { diff: "git diff" },
  output: { summary: "review summary", issues: ["issue"] },
  agents: { summarizeDiff },
});
```

### 3) Unknown/raw extraction (`src/samples/40-record-output.ts`)

```ts
import { agent } from "rig";

const extractJson = agent("extractJson", {
  input: { text: "raw command output" },
  output: { raw: agent.unknown(), summary: "summary of raw object" },
});
```

### 4) Middleware enrichment (`src/samples/51-middleware-enrichment.ts`)

```ts
import { agent } from "rig";

const classify = agent("classify", {
  input: { issueDescription: "issue description" },
  output: {
    triageSummary: "triage summary",
  },
});

classify.use(async (ctx, next) => {
  if (ctx.phase === "beforeSend") {
    ctx.prompt += "\nAlways reply with strict JSON matching the schema.";
  }

  await next();

  if (ctx.phase === "afterParse" && ctx.parsed && typeof ctx.parsed === "object") {
    const triageSummary = "triageSummary" in ctx.parsed && typeof ctx.parsed.triageSummary === "string"
      ? ctx.parsed.triageSummary
      : "text" in ctx.parsed && typeof ctx.parsed.text === "string"
      ? ctx.parsed.text
      : "middleware summary";
    ctx.parsed = { ...ctx.parsed, triageSummary: `${triageSummary} [middleware]` };
  }
});
```

## Core ideas

- **Shapes as contracts**: `input` and `output` are runtime-validated shapes.
- **Typed helpers**:
  - `agent.enum([...])`
  - `agent.literal(value)`
  - `agent.nullable(shape)`
  - `agent.unknown()`
- **Intents, not side effects**: shell work is declared in input and resolved by the engine.
- **Composable agents**: pass subagents with `agents: { ... }`.
- **Middleware**: intercept `beforeCall`, `beforeSend`, `afterSend`, `afterParse`, `afterValidate`, `afterCall`, and `error` (`onError` in the legacy hooks API).

## Middleware

Middleware lets you inspect or modify agent state at each phase of a call.

```ts
import { agent } from "rig";

agent.use(async (ctx, next) => {
  if (ctx.phase === "beforeSend") {
    ctx.prompt += "\nRespond with valid JSON only.";
  }
  await next();
});

const supportAgent = agent("supportAgent", {
  middleware: [async (ctx, next) => {
    if (ctx.phase === "afterParse") {
      ctx.parsed = { ...ctx.parsed, handledBy: "middleware" };
    }
    await next();
  }],
});
```

- Register global middleware with `agent.use(...)`.
- Register per-agent middleware with `middleware: [...]` or `myAgent.use(...)`.
- Each registration returns an unsubscribe function.
- Legacy `hooks` remain available for compatibility. `onError` maps to the middleware `error` phase, and `afterValidate` is available only in middleware.

## Local development

```bash
npm install
npm test
npm run typecheck
npm run sample
```

## Project status

`rig` is intentionally small and experimental. The focus is a clean, practical API for structured agent calls in JavaScript/TypeScript.
