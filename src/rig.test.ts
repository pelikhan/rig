import { describe, it, expect, beforeEach } from "vitest";
import { agent, sh, collectIntents, validate, useEngine } from "rig";
import type { Engine } from "rig";

function mockEngine(response: unknown): Engine {
  return {
    createSession() {
      return { async send() { return JSON.stringify(response); } };
    },
  };
}

beforeEach(() => {
  useEngine(mockEngine({ text: "default" }));
});

describe("agent construction", () => {
  it("creates an agent with name and default shapes", () => {
    const a = agent("test-agent");
    expect(a.agentName).toBe("test-agent");
    expect(a.inputShape).toEqual({ text: "input text" });
    expect(a.outputShape).toEqual({ text: "output text" });
  });

  it("creates an agent with custom input/output shapes", () => {
    const a = agent("custom", {
      input: { url: "a url", depth: 1 },
      output: { links: ["url"], count: 0 },
    });
    expect(a.inputShape).toEqual({ url: "a url", depth: 1 });
    expect(a.outputShape).toEqual({ links: ["url"], count: 0 });
  });

  it("preserves agent metadata for subagent declarations", () => {
    const sub = agent("sub", { input: { query: "q" }, output: { answer: "a" } });
    const parent = agent("parent", { agents: { sub }, output: { result: "r" } });
    expect(parent.agentName).toBe("parent");
    expect(sub.agentName).toBe("sub");
  });
});

describe("agent invocation", () => {
  it("calls mock engine and returns parsed output", async () => {
    useEngine(mockEngine({ text: "hello world" }));
    const greet = agent("greeter");
    const result = await greet({ text: "Hi" });
    expect(result).toEqual({ text: "hello world" });
  });

  it("throws on invalid JSON without onError hook", async () => {
    useEngine({ createSession() { return { async send() { return "not json"; } }; } });
    const a = agent("no-hook");
    await expect(a({ text: "go" })).rejects.toThrow(/invalid JSON/);
  });

  it("throws on shape mismatch without onError hook", async () => {
    useEngine(mockEngine({ wrong: 123 }));
    const a = agent("no-hook");
    await expect(a({ text: "go" })).rejects.toThrow(/validation failed/);
  });

  it("supports call options override", async () => {
    let receivedModel = "";
    useEngine({
      createSession(opts) {
        receivedModel = opts.model;
        return { async send() { return JSON.stringify({ text: "ok" }); } };
      },
    });
    const a = agent("model-test", { model: "gpt-4.1" });
    await a({ text: "x" }, { model: "o3-mini" });
    expect(receivedModel).toBe("o3-mini");
  });

  it("respects timeout via AbortSignal", async () => {
    useEngine({
      createSession() {
        return {
          async send(_prompt, opts) {
            await new Promise((_, reject) => {
              opts.signal?.addEventListener("abort", () => reject(opts.signal!.reason));
              setTimeout(() => reject(new Error("should have aborted")), 5000);
            });
            return "";
          },
        };
      },
    });
    const a = agent("timeout-test", { timeout: 50 });
    await expect(a({ text: "go" })).rejects.toThrow(/Timed out/);
  });
});

describe("hooks", () => {
  it("beforeCall transforms input", async () => {
    let seenInput: any;
    useEngine({
      createSession() {
        return { async send(prompt) { seenInput = prompt; return JSON.stringify({ text: "ok" }); } };
      },
    });
    const a = agent("hook-test", {
      hooks: {
        beforeCall(ctx) { return { text: ctx.input.text + " modified" }; },
      },
    });
    await a({ text: "hello" });
    expect(seenInput).toContain("modified");
  });

  it("beforeSend transforms prompt", async () => {
    let sentPrompt = "";
    useEngine({
      createSession() {
        return { async send(prompt) { sentPrompt = prompt; return JSON.stringify({ text: "ok" }); } };
      },
    });
    const a = agent("hook-test", {
      hooks: {
        beforeSend(ctx) { return ctx.prompt + "\nEXTRA INSTRUCTION"; },
      },
    });
    await a({ text: "hi" });
    expect(sentPrompt).toContain("EXTRA INSTRUCTION");
  });

  it("afterSend transforms raw response", async () => {
    useEngine({
      createSession() {
        return { async send() { return "```json\n{\"text\": \"raw\"}\n```"; } };
      },
    });
    const a = agent("hook-test", {
      hooks: {
        afterSend() { return JSON.stringify({ text: "intercepted" }); },
      },
    });
    const result = await a({ text: "go" });
    expect(result).toEqual({ text: "intercepted" });
  });

  it("afterParse transforms parsed value", async () => {
    useEngine(mockEngine({ text: "original", extra: true }));
    const a = agent("hook-test", {
      hooks: {
        afterParse(ctx) { return { text: ctx.parsed.text + " transformed" }; },
      },
    });
    const result = await a({ text: "go" });
    expect(result).toEqual({ text: "original transformed" });
  });

  it("onError enables retry by returning a new prompt", async () => {
    let calls = 0;
    useEngine({
      createSession() {
        return {
          async send() {
            calls++;
            if (calls === 1) return "garbage";
            return JSON.stringify({ text: "recovered" });
          },
        };
      },
    });
    const a = agent("retry-hook", {
      max_turns: 3,
      hooks: {
        onError(ctx) { return `Fix it. Error: ${ctx.error}`; },
      },
    });
    const result = await a({ text: "go" });
    expect(result).toEqual({ text: "recovered" });
    expect(calls).toBe(2);
  });

  it("onError without return throws immediately", async () => {
    useEngine({ createSession() { return { async send() { return "bad"; } }; } });
    const errors: string[] = [];
    const a = agent("no-retry", {
      max_turns: 5,
      hooks: {
        onError(ctx) { errors.push(ctx.error); },
      },
    });
    await expect(a({ text: "go" })).rejects.toThrow(/invalid JSON/);
    expect(errors).toHaveLength(1);
  });

  it("afterCall observes final output", async () => {
    useEngine(mockEngine({ text: "done" }));
    let observed: any;
    const a = agent("observe", {
      hooks: {
        afterCall(ctx) { observed = ctx; },
      },
    });
    await a({ text: "hi" });
    expect(observed.agent).toBe("observe");
    expect(observed.output).toEqual({ text: "done" });
    expect(observed.input).toEqual({ text: "hi" });
  });

  it("global hooks via agent.on()", async () => {
    const log: string[] = [];
    const off = agent.on({
      beforeCall(ctx) { log.push(`call:${ctx.agent}`); },
      afterCall(ctx) { log.push(`done:${ctx.agent}`); },
    });
    useEngine(mockEngine({ text: "ok" }));
    const a = agent("global-test");
    await a({ text: "x" });
    expect(log).toEqual(["call:global-test", "done:global-test"]);
    off();
    await a({ text: "x" });
    expect(log).toHaveLength(2); // no new entries after off()
  });

  it("multiple hooks compose in order", async () => {
    const order: number[] = [];
    const off1 = agent.on({ beforeSend() { order.push(1); } });
    const off2 = agent.on({ beforeSend() { order.push(2); } });
    useEngine(mockEngine({ text: "ok" }));
    const a = agent("compose", {
      hooks: { beforeSend() { order.push(3); } },
    });
    await a({ text: "x" });
    expect(order).toEqual([1, 2, 3]);
    off1();
    off2();
  });
});

describe("sh intents", () => {
  it("sh.text creates a text intent", () => {
    const intent = sh.text("ls -la");
    expect(intent.__rig).toBe("sh");
    expect(intent.mode).toBe("sh.text");
    expect(intent.command).toBe("ls -la");
  });

  it("sh.result creates a result intent", () => {
    const intent = sh.result("npm test", { cwd: "/app", timeout: 5000 });
    expect(intent.mode).toBe("sh.result");
    expect(intent.command).toBe("npm test");
    expect(intent.options).toEqual({ cwd: "/app", timeout: 5000 });
  });

  it("sh.write creates a write intent", () => {
    const intent = sh.write("out.txt", "hello", { purpose: "test" });
    expect(intent.mode).toBe("sh.write");
    expect(intent.path).toBe("out.txt");
    expect(intent.contents).toBe("hello");
    expect(intent.options).toEqual({ purpose: "test" });
  });

  it("strips signal from options", () => {
    const controller = new AbortController();
    const intent = sh.text("echo hi", { signal: controller.signal, cwd: "/tmp" });
    expect(intent.options).toEqual({ cwd: "/tmp" });
    expect(intent.options).not.toHaveProperty("signal");
  });
});

describe("collectIntents", () => {
  it("extracts intents from nested input", () => {
    const input = { diff: sh.text("git diff"), status: sh.text("git status --short") };
    const { value, intents } = collectIntents(input);
    expect(intents).toHaveLength(2);
    expect(intents[0].command).toBe("git diff");
    expect(intents[1].command).toBe("git status --short");
    expect(value.diff).toEqual({ $intent: intents[0].id });
    expect(value.status).toEqual({ $intent: intents[1].id });
  });

  it("leaves non-intent values unchanged", () => {
    const input = { name: "test", count: 42, nested: { a: true } };
    const { value, intents } = collectIntents(input);
    expect(intents).toHaveLength(0);
    expect(value).toEqual(input);
  });

  it("handles arrays with intents", () => {
    const input = { commands: [sh.text("ls"), sh.text("pwd")] };
    const { value, intents } = collectIntents(input);
    expect(intents).toHaveLength(2);
    expect(value.commands[0]).toHaveProperty("$intent");
  });
});

describe("validate", () => {
  it("validates matching string shape", () => {
    expect(validate("hello", "")).toEqual({ ok: true });
  });

  it("rejects number when string expected", () => {
    expect(validate(42, "").ok).toBe(false);
  });

  it("validates object shapes", () => {
    const shape = { name: "", age: 0 };
    expect(validate({ name: "Alice", age: 30 }, shape)).toEqual({ ok: true });
    expect(validate({ name: "Alice", age: "thirty" }, shape).ok).toBe(false);
  });

  it("validates arrays", () => {
    expect(validate(["a", "b"], [""]).ok).toBe(true);
    expect(validate([1, 2], [""]).ok).toBe(false);
  });

  it("validates enum marker", () => {
    const shape = agent.enum(["low", "medium", "high"] as const);
    expect(validate("low", shape)).toEqual({ ok: true });
    expect(validate("critical", shape).ok).toBe(false);
  });

  it("validates literal marker", () => {
    const shape = agent.literal(true);
    expect(validate(true, shape)).toEqual({ ok: true });
    expect(validate(false, shape).ok).toBe(false);
  });

  it("validates nullable marker", () => {
    const shape = agent.nullable("text");
    expect(validate(null, shape)).toEqual({ ok: true });
    expect(validate("hello", shape)).toEqual({ ok: true });
    expect(validate(42, shape).ok).toBe(false);
  });

  it("validates unknown marker", () => {
    const shape = agent.unknown();
    expect(validate("anything", shape)).toEqual({ ok: true });
    expect(validate(null, shape)).toEqual({ ok: true });
  });

  it("validates optional keys (trailing underscore)", () => {
    const shape = { name: "", bio_: "" };
    expect(validate({ name: "Alice" }, shape)).toEqual({ ok: true });
    expect(validate({ name: "Alice", bio: "hi" }, shape)).toEqual({ ok: true });
  });

  it("validates wildcard record shape", () => {
    const shape = { "*": "" };
    expect(validate({ a: "x", b: "y" }, shape)).toEqual({ ok: true });
    expect(validate({ a: 1 }, shape).ok).toBe(false);
  });
});

describe("sample patterns", () => {
  it("classify-issue: structured enum output", async () => {
    useEngine(mockEngine({ label: "bug", confidence: "high" }));
    const classify = agent("classify", {
      input: { title: "", body: "" },
      output: {
        label: agent.enum(["bug", "feature", "question", "docs"]),
        confidence: agent.enum(["low", "medium", "high"]),
      },
    });
    const result = await classify({ title: "App crashes", body: "segfault" });
    expect(result.label).toBe("bug");
    expect(result.confidence).toBe("high");
  });

  it("subagent delegation", async () => {
    useEngine(mockEngine({ summary: "looks good", issues: [] }));
    const summarizeDiff = agent("summarizeDiff", {
      input: { diff: "git diff" },
      output: { summary: "diff summary", files: ["file"] },
    });
    const reviewer = agent("reviewer", {
      input: { diff: "git diff" },
      output: { summary: "review summary", issues: ["issue"] },
      agents: { summarizeDiff },
    });
    const result = await reviewer({ diff: "content" });
    expect(result.summary).toBe("looks good");
  });

  it("intent-options carry through to prompt", async () => {
    let capturedPrompt = "";
    useEngine({
      createSession() {
        return {
          async send(prompt) {
            capturedPrompt = prompt;
            return JSON.stringify({ observations: ["found it"], likelyEntryPoints: ["src/index.ts"] });
          },
        };
      },
    });
    const investigator = agent("investigator", {
      input: { tree: "repo tree", packageJson: "package.json" },
      output: { observations: ["observation"], likelyEntryPoints: ["file"] },
      permissions: { shell: "readonly", write: "deny" },
    });
    await investigator({
      tree: sh.text("find . -maxdepth 3 -type f | sort"),
      packageJson: sh.text("cat package.json"),
    });
    expect(capturedPrompt).toContain("sh.text");
    expect(capturedPrompt).toContain("find . -maxdepth 3 -type f | sort");
    expect(capturedPrompt).toContain('"shell": "readonly"');
  });
});
