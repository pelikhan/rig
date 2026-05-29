import { beforeEach, describe, expect, it } from "vitest";
import { AgentError, agent, collectIntents, p, s, sh, useEngine, validate } from "rig";
import type { Engine, ShIntent } from "rig";

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

describe("agent", () => {
  it("creates an agent from a structured spec", () => {
    const classify = agent({
      name: "classify",
      instructions: "Classify the issue.",
      input: s.object({
        title: s.string,
        body: s.string,
      }),
      output: s.object({
        label: s.enum("bug", "feature", "question", "docs"),
        confidence: s.enum("low", "medium", "high"),
      }),
    });

    expect(classify.agentName).toBe("classify");
    expect(classify.inputSchema).toEqual(s.object({ title: s.string, body: s.string }));
    expect(classify.outputSchema).toEqual(s.object({
      label: s.enum("bug", "feature", "question", "docs"),
      confidence: s.enum("low", "medium", "high"),
    }));
  });

  it("preserves type inference for schema helpers", async () => {
    useEngine(mockEngine({
      summary: "Looks good",
      risk: "low",
      findings: [{ file: "src/index.ts", message: "Check edge case" }],
    }));

    const review = agent({
      name: "review",
      input: s.object({ diff: s.string }),
      output: s.object({
        summary: s.string,
        risk: s.enum("low", "medium", "high"),
        findings: s.array(s.object({
          file: s.string,
          line: s.optional(s.number),
          message: s.string,
        })),
      }),
    });

    type Review = Awaited<ReturnType<typeof review>>;
    const risk: Review["risk"] = "low";
    const line: Review["findings"][number]["line"] = undefined;

    const result = await review({ diff: "..." });
    expect(risk).toBe("low");
    expect(line).toBeUndefined();
    expect(result.risk).toBe("low");
    expect(result.findings[0]?.line).toBeUndefined();
  });

  it("does not expose deprecated hook APIs in core", () => {
    expect((agent as { on?: unknown }).on).toBeUndefined();
    expect((agent as { use?: unknown }).use).toBeUndefined();
  });
});

describe("agent invocation", () => {
  it("calls the engine and returns validated data", async () => {
    useEngine(mockEngine({ text: "hello world" }));
    const greet = agent({
      name: "greeter",
      input: s.object({ text: s.string }),
      output: s.object({ text: s.string }),
    });

    await expect(greet({ text: "Hi" })).resolves.toEqual({ text: "hello world" });
  });

  it("retries invalid JSON with the default repair prompt", async () => {
    const prompts: string[] = [];
    let calls = 0;

    useEngine({
      createSession() {
        return {
          async send(prompt) {
            prompts.push(prompt);
            calls += 1;
            return calls === 1 ? "not json" : JSON.stringify({ text: "repaired" });
          },
        };
      },
    });

    const repairable = agent({
      name: "repairable",
      maxTurns: 2,
    });

    await expect(repairable({ text: "go" })).resolves.toEqual({ text: "repaired" });
    expect(prompts).toHaveLength(2);
    expect(prompts[1]).toContain("<repair");
    expect(prompts[1]).toContain("invalid JSON");
  });

  it("retries validation failures with a custom repair prompt", async () => {
    const prompts: string[] = [];
    let calls = 0;

    useEngine({
      createSession() {
        return {
          async send(prompt) {
            prompts.push(prompt);
            calls += 1;
            return calls === 1 ? JSON.stringify({ wrong: true }) : JSON.stringify({ text: "fixed" });
          },
        };
      },
    });

    const repairable = agent({
      name: "repairable",
      repair(error) {
        return `please fix: ${error.message}`;
      },
      maxTurns: 2,
    });

    await expect(repairable({ text: "go" })).resolves.toEqual({ text: "fixed" });
    expect(prompts[1]).toContain("please fix");
  });

  it("throws AgentError when repair is disabled", async () => {
    useEngine({
      createSession() {
        return { async send() { return "not json"; } };
      },
    });

    const strict = agent({
      name: "strict",
      repair: false,
    });

    await expect(strict({ text: "go" })).rejects.toBeInstanceOf(AgentError);
    await expect(strict({ text: "go" })).rejects.toMatchObject({ kind: "parse" });
  });

  it("supports per-call engine overrides", async () => {
    let model = "";
    useEngine({
      createSession(options) {
        model = options.model;
        return { async send() { return JSON.stringify({ text: "ok" }); } };
      },
    });

    const call = agent({ name: "model-test", model: "gpt-4.1" });
    await call({ text: "x" }, { model: "o3-mini" });
    expect(model).toBe("o3-mini");
  });

  it("supports timeout and abort signals", async () => {
    useEngine({
      createSession() {
        return {
          async send(_prompt, options) {
            await new Promise((_, reject) => {
              options.signal?.addEventListener("abort", () => reject(options.signal?.reason), { once: true });
              setTimeout(() => reject(new Error("should have aborted")), 5000);
            });
            return "";
          },
        };
      },
    });

    const slow = agent({ name: "timeout-test" });
    await expect(slow({ text: "go" }, { timeout: 50 })).rejects.toThrow(/Timed out/);
  });

  it("inlines shell prompts and omits top-level prompt metadata", async () => {
    const prompts: string[] = [];

    useEngine({
      createSession() {
        return {
          async send(prompt) {
            prompts.push(prompt);
            return JSON.stringify({ text: "ok" });
          },
        };
      },
    });

    const inspect = agent({
      name: "inspect",
      input: s.object({ status: s.string, diff: s.string }),
      output: s.object({ text: s.string }),
    });

    await inspect({
      status: sh.text("git status --short"),
      diff: sh.result("git diff --stat", { cwd: "/tmp/workspace" }),
    });

    expect(prompts[0]).not.toContain("<intents>");
    expect(prompts[0]).not.toContain("<input_schema>");
    expect(prompts[0]).not.toContain('<agent name="inspect">');
    expect(prompts[0]).toContain("Run bash command and return stdout as text: git status --short");
    expect(prompts[0]).toContain("Run bash command and return a structured result (stdout, stderr, exitCode): git diff --stat");
    expect(prompts[0]).toContain("Options:");
    expect(prompts[0]).toContain("/tmp/workspace");
  });

  it("supports shell helpers inside instruction templates", async () => {
    const prompts: string[] = [];

    useEngine({
      createSession() {
        return {
          async send(prompt) {
            prompts.push(prompt);
            return JSON.stringify({ text: "ok" });
          },
        };
      },
    });

    const inspect = agent({
      name: "inspect",
      instructions: p`Review the repo using ${sh.shell("git status --short", { cwd: "/tmp/workspace" })} before answering.`,
      output: s.object({ text: s.string }),
    });

    await inspect({ text: "go" });

    expect(prompts[0]).toContain("Review the repo using Run bash command and return stdout as text: git status --short");
    expect(prompts[0]).toContain("Options:");
    expect(prompts[0]).toContain("/tmp/workspace");
    expect(prompts[0]).toContain("before answering.");
  });
});

describe("validate", () => {
  it("validates primitive helpers", () => {
    expect(validate("hello", s.string)).toEqual({ ok: true });
    expect(validate(42, s.number)).toEqual({ ok: true });
    expect(validate(true, s.boolean)).toEqual({ ok: true });
  });

  it("validates object, optional, and record schemas", () => {
    const schema = s.object({
      name: s.string,
      bio: s.optional(s.string),
      metadata: s.record(s.string),
    });

    expect(validate({ name: "Alice", metadata: { role: "admin" } }, schema)).toEqual({ ok: true });
    expect(validate({ name: "Alice", bio: 1, metadata: {} }, schema).ok).toBe(false);
    expect(validate({ name: "Alice", metadata: { role: 1 } }, schema).ok).toBe(false);
  });

  it("validates enum, literal, nullable, and unknown helpers", () => {
    expect(validate("low", s.enum("low", "medium", "high"))).toEqual({ ok: true });
    expect(validate(true, s.literal(true))).toEqual({ ok: true });
    expect(validate(null, s.nullable(s.string))).toEqual({ ok: true });
    expect(validate({ anything: [1, 2, 3] }, s.unknown)).toEqual({ ok: true });
  });

  it("accepts legacy exemplar compatibility", () => {
    expect(validate({ name: "Alice", bio: "hi" }, { name: "", bio_: "" })).toEqual({ ok: true });
    expect(validate({ a: "x", b: "y" }, { "*": "" })).toEqual({ ok: true });
  });
});

describe("shell intents", () => {
  it("exports shell helpers from rig", async () => {
    const compat = await import("rig");
    expect(compat.sh.read("README.md").mode).toBe("sh.read");
    expect(compat.sh.shell("git status --short").mode).toBe("sh.text");
    expect(typeof compat.p).toBe("function");
  });

  it("collects intents from nested input", () => {
    const input = {
      diff: sh.text("git diff"),
      result: sh.result("npm test", { cwd: "/tmp/workspace" }),
      readme: sh.read("README.md"),
    };

    const { value, intents } = collectIntents(input);
    expect(intents).toHaveLength(3);
    expect((intents[0] as ShIntent)?.mode).toBe("sh.text");
    expect((intents[1] as ShIntent)?.mode).toBe("sh.result");
    expect((intents[2] as ShIntent)?.mode).toBe("sh.read");
    expect(value).toEqual({
      diff: { $intent: intents[0]?.id },
      result: { $intent: intents[1]?.id },
      readme: { $intent: intents[2]?.id },
    });
  });

  it("strips AbortSignal from sh options", () => {
    const controller = new AbortController();
    const intent = sh.text("echo hi", { cwd: "/tmp", signal: controller.signal });

    expect(intent.options).toEqual({ cwd: "/tmp" });
  });
});

describe("intent / input / output primitives", () => {
  it("intent() creates a generic intent with unique ids", async () => {
    const { intent } = await import("rig");
    const a = intent("github.issue", { number: 1 });
    const b = intent("github.issue", { number: 2 });

    expect(a.__rig).toBe("intent");
    expect(a.kind).toBe("github.issue");
    expect(a.payload).toEqual({ number: 1 });
    expect(a.id).not.toBe(b.id);
  });

  it("collectIntents picks up generic intents", async () => {
    const { intent } = await import("rig");
    const issue = intent("github.issue", { number: 42 });
    const { value, intents } = collectIntents({ a: issue, b: sh.text("ls") });

    expect(intents).toHaveLength(2);
    expect(value).toEqual({ a: { $intent: issue.id }, b: { $intent: (intents[1] as ShIntent).id } });
  });

  it("input() with custom render replaces the input section in the prompt", async () => {
    const { input } = await import("rig");
    const prompts: string[] = [];
    useEngine({
      createSession() {
        return { async send(prompt) { prompts.push(prompt); return JSON.stringify({ text: "ok" }); } };
      },
    });

    const Issue = input({
      schema: s.object({ number: s.number, title: s.string }),
      render: (v) => `<issue n="${v.number}">${v.title}</issue>`,
    });

    const fn = agent({ name: "uses-input", input: Issue, output: s.object({ text: s.string }) });
    await fn({ number: 7, title: "boom" });

    expect(prompts[0]).toContain('<issue n="7">boom</issue>');
    expect(prompts[0]).not.toMatch(/"number":\s*7/);
  });

  it("output() with custom parse skips JSON parsing", async () => {
    const { output } = await import("rig");
    useEngine({
      createSession() {
        return { async send() { return "DIFF: hello"; } };
      },
    });

    const Patch = output({
      schema: s.object({ diff: s.string }),
      parse: (response) => ({ diff: response.replace(/^DIFF:\s*/, "") }),
    });

    const fn = agent({ name: "patcher", output: Patch });
    await expect(fn({ text: "go" })).resolves.toEqual({ diff: "hello" });
  });

  it("output.parse errors trigger the repair loop like JSON parse errors", async () => {
    const { output } = await import("rig");
    let calls = 0;
    useEngine({
      createSession() {
        return {
          async send() {
            calls += 1;
            return calls === 1 ? "garbage" : "VALUE:ok";
          },
        };
      },
    });

    const Custom = output({
      schema: s.object({ value: s.string }),
      parse: (response) => {
        const m = response.match(/^VALUE:(.+)$/);
        if (!m) throw new Error("bad format");
        return { value: m[1] };
      },
    });

    const fn = agent({ name: "custom-parse", output: Custom, maxTurns: 2 });
    await expect(fn({ text: "go" })).resolves.toEqual({ value: "ok" });
    expect(calls).toBe(2);
  });

  it("repair precedence: CallOptions > AgentSpec > Output > default", async () => {
    const { output } = await import("rig");
    const prompts: string[] = [];
    useEngine({
      createSession() {
        return {
          async send(prompt) {
            prompts.push(prompt);
            return prompts.length === 1 ? "not json" : JSON.stringify({ text: "ok" });
          },
        };
      },
    });

    const Out = output({ schema: s.object({ text: s.string }), repair: () => "OUT-REPAIR" });
    const fn = agent({ name: "rp", output: Out, repair: () => "SPEC-REPAIR", maxTurns: 2 });

    await fn({ text: "go" }, { repair: () => "OPT-REPAIR" });
    expect(prompts[1]).toBe("OPT-REPAIR");
  });

  it("repair falls back from spec to output when spec absent", async () => {
    const { output } = await import("rig");
    const prompts: string[] = [];
    useEngine({
      createSession() {
        return {
          async send(prompt) {
            prompts.push(prompt);
            return prompts.length === 1 ? "not json" : JSON.stringify({ text: "ok" });
          },
        };
      },
    });

    const Out = output({ schema: s.object({ text: s.string }), repair: () => "OUT-REPAIR" });
    const fn = agent({ name: "rp2", output: Out, maxTurns: 2 });
    await fn({ text: "go" });
    expect(prompts[1]).toBe("OUT-REPAIR");
  });
});

describe("extensions", () => {
  it("defineExtension is identity and preserves inference", async () => {
    const { defineExtension, intent, input, output } = await import("rig");
    const ext = defineExtension({
      name: "x",
      sh: { hello: (n: string) => intent("x.hello", { n }) },
      inputs: { I: input({ schema: s.object({ a: s.number }) }) },
      outputs: { O: output({ schema: s.object({ b: s.string }) }) },
    });

    expect(ext.name).toBe("x");
    expect(ext.sh!.hello("y").kind).toBe("x.hello");
    expect(ext.inputs!.I.__rig).toBe("input");
    expect(ext.outputs!.O.__rig).toBe("output");
  });

  it("on() fires call/result events in order", async () => {
    const { defineExtension, useExtension, __resetExtensions } = await import("rig");
    __resetExtensions();
    useEngine({ createSession() { return { async send() { return JSON.stringify({ text: "ok" }); } }; } });

    const events: string[] = [];
    useExtension(defineExtension({
      name: "obs",
      on: (e) => { events.push(`${e.type}@${e.turn}`); },
    }));

    const fn = agent({ name: "observed", output: s.object({ text: s.string }) });
    await fn({ text: "go" });

    expect(events).toEqual(["call@1", "result@1"]);
    __resetExtensions();
  });

  it("on() fires error event when validation fails terminally", async () => {
    const { defineExtension, useExtension, __resetExtensions } = await import("rig");
    __resetExtensions();
    useEngine({ createSession() { return { async send() { return JSON.stringify({ wrong: true }); } }; } });

    const events: string[] = [];
    useExtension(defineExtension({
      name: "err",
      on: (e) => { events.push(e.type); },
    }));

    const fn = agent({ name: "bad", output: s.object({ text: s.string }), repair: false });
    await expect(fn({ text: "go" })).rejects.toBeInstanceOf(AgentError);

    expect(events).toContain("call");
    expect(events).toContain("error");
    __resetExtensions();
  });

  it("throwing from on() aborts the call", async () => {
    const { defineExtension, useExtension, __resetExtensions } = await import("rig");
    __resetExtensions();
    useEngine({ createSession() { return { async send() { return JSON.stringify({ text: "ok" }); } }; } });

    useExtension(defineExtension({
      name: "blocker",
      on: (e) => { if (e.type === "call") throw new Error("blocked"); },
    }));

    const fn = agent({ name: "blocked", output: s.object({ text: s.string }) });
    await expect(fn({ text: "go" })).rejects.toThrow("blocked");
    __resetExtensions();
  });

  it("wrapEngine composes first-registered as outermost", async () => {
    const { defineExtension, useExtension, __resetExtensions } = await import("rig");
    __resetExtensions();
    const order: string[] = [];

    useEngine({
      createSession() {
        return { async send() { order.push("base"); return JSON.stringify({ text: "ok" }); } };
      },
    });

    useExtension(defineExtension({
      name: "outer",
      wrapEngine: (next) => ({
        createSession(opts) {
          const inner = next.createSession(opts);
          return { async send(p, o) { order.push("outer-in"); const r = await inner.send(p, o); order.push("outer-out"); return r; } };
        },
      }),
    }));
    useExtension(defineExtension({
      name: "inner",
      wrapEngine: (next) => ({
        createSession(opts) {
          const inner = next.createSession(opts);
          return { async send(p, o) { order.push("inner-in"); const r = await inner.send(p, o); order.push("inner-out"); return r; } };
        },
      }),
    }));

    const fn = agent({ name: "wrap", output: s.object({ text: s.string }) });
    await fn({ text: "go" });

    expect(order).toEqual(["outer-in", "inner-in", "base", "inner-out", "outer-out"]);
    __resetExtensions();
  });

  it("per-agent extensions scope only to that agent", async () => {
    const { defineExtension, __resetExtensions } = await import("rig");
    __resetExtensions();
    useEngine({ createSession() { return { async send() { return JSON.stringify({ text: "ok" }); } }; } });

    const seen: string[] = [];
    const scoped = defineExtension({
      name: "scoped",
      on: (e) => { if (e.type === "call") seen.push("scoped"); },
    });

    const a = agent({ name: "scoped-agent", extensions: [scoped], output: s.object({ text: s.string }) });
    const b = agent({ name: "plain-agent", output: s.object({ text: s.string }) });

    await a({ text: "1" });
    await b({ text: "2" });
    expect(seen).toEqual(["scoped"]);
  });

  it("useExtension dedupes by identity", async () => {
    const { defineExtension, useExtension, listExtensions, __resetExtensions } = await import("rig");
    __resetExtensions();
    const ext = defineExtension({ name: "dup" });
    useExtension(ext);
    useExtension(ext);
    expect(listExtensions()).toHaveLength(1);
    __resetExtensions();
  });
});

