import { describe, it, expect, beforeEach } from "vitest";
import { agent, sh, collectIntents, validate, useEngine } from "rig";
import type { Engine } from "rig";

// Mock engine that returns a canned JSON response
function mockEngine(response: unknown): Engine {
  return {
    async send() {
      return JSON.stringify(response);
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
    const sub = agent("sub", {
      input: { query: "q" },
      output: { answer: "a" },
    });
    const parent = agent("parent", {
      agents: { sub },
      output: { result: "r" },
    });
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

  it("retries when engine returns invalid JSON", async () => {
    let calls = 0;
    useEngine({
      async send() {
        calls++;
        if (calls === 1) return "not json at all";
        return JSON.stringify({ text: "recovered" });
      },
    });
    const a = agent("retry-test", { max_turns: 3 });
    const result = await a({ text: "go" });
    expect(result).toEqual({ text: "recovered" });
    expect(calls).toBe(2);
  });

  it("retries when output shape doesn't match", async () => {
    let calls = 0;
    useEngine({
      async send() {
        calls++;
        if (calls === 1) return JSON.stringify({ wrong: 123 });
        return JSON.stringify({ text: "fixed" });
      },
    });
    const a = agent("shape-retry", { max_turns: 3 });
    const result = await a({ text: "go" });
    expect(result).toEqual({ text: "fixed" });
    expect(calls).toBe(2);
  });

  it("throws after exhausting max_turns", async () => {
    useEngine({ async send() { return "garbage"; } });
    const a = agent("fail", { max_turns: 2 });
    await expect(a({ text: "go" })).rejects.toThrow(/failed to produce valid output after 2 turn/);
  });

  it("supports call options override", async () => {
    let receivedModel = "";
    useEngine({
      async send(_prompt, opts) {
        receivedModel = opts.model;
        return JSON.stringify({ text: "ok" });
      },
    });
    const a = agent("model-test", { model: "gpt-4.1" });
    await a({ text: "x" }, { model: "o3-mini" });
    expect(receivedModel).toBe("o3-mini");
  });

  it("respects timeout via AbortSignal", async () => {
    useEngine({
      async send(_prompt, opts) {
        await new Promise((_, reject) => {
          opts.signal?.addEventListener("abort", () => reject(opts.signal!.reason));
          setTimeout(() => reject(new Error("should have aborted")), 5000);
        });
        return "";
      },
    });
    const a = agent("timeout-test", { timeout: 50 });
    await expect(a({ text: "go" })).rejects.toThrow(/Timed out/);
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
    const input = {
      diff: sh.text("git diff"),
      status: sh.text("git status --short"),
    };
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
    expect(value.commands).toHaveLength(2);
    expect(value.commands[0]).toHaveProperty("$intent");
  });
});

describe("validate", () => {
  it("validates matching string shape", () => {
    expect(validate("hello", "")).toEqual({ ok: true });
  });

  it("rejects number when string expected", () => {
    const r = validate(42, "");
    expect(r.ok).toBe(false);
  });

  it("validates object shapes", () => {
    const shape = { name: "", age: 0 };
    expect(validate({ name: "Alice", age: 30 }, shape)).toEqual({ ok: true });
    expect(validate({ name: "Alice", age: "thirty" }, shape).ok).toBe(false);
  });

  it("validates arrays", () => {
    const shape = [""];
    expect(validate(["a", "b", "c"], shape)).toEqual({ ok: true });
    expect(validate([1, 2], shape).ok).toBe(false);
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
    expect(validate({ x: 1 }, shape)).toEqual({ ok: true });
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

describe("sample: classify-issue pattern (09)", () => {
  it("produces structured enum output", async () => {
    useEngine(mockEngine({ label: "bug", confidence: "high" }));
    const classify = agent("classify", {
      input: { title: "", body: "" },
      output: {
        label: agent.enum(["bug", "feature", "question", "docs"]),
        confidence: agent.enum(["low", "medium", "high"]),
      },
    });
    const result = await classify({ title: "App crashes", body: "segfault on start" });
    expect(result.label).toBe("bug");
    expect(result.confidence).toBe("high");
  });
});

describe("sample: subagent delegation pattern (36)", () => {
  it("declares subagents on parent agent", async () => {
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

    const result = await reviewer({ diff: "some diff content" });
    expect(result.summary).toBe("looks good");
    expect(result.issues).toEqual([]);
  });
});

describe("sample: intent-options pattern (34)", () => {
  it("sh intents carry options through to prompts", async () => {
    let capturedPrompt = "";
    useEngine({
      async send(prompt) {
        capturedPrompt = prompt;
        return JSON.stringify({ observations: ["found tsconfig"], likelyEntryPoints: ["src/index.ts"] });
      },
    });

    const investigator = agent("investigator", {
      input: { tree: "repo tree", packageJson: "package.json" },
      output: { observations: ["observation"], likelyEntryPoints: ["file"] },
      permissions: { shell: "readonly", write: "deny" },
    });

    const result = await investigator({
      tree: sh.text("find . -maxdepth 3 -type f | sort"),
      packageJson: sh.text("cat package.json"),
    });

    expect(result.observations).toContain("found tsconfig");
    expect(capturedPrompt).toContain("sh.text");
    expect(capturedPrompt).toContain("find . -maxdepth 3 -type f | sort");
    expect(capturedPrompt).toContain('"shell": "readonly"');
  });
});
