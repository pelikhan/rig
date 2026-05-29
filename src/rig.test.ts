import { beforeEach, describe, expect, it } from "vitest";
import { AgentError, agent, collectIntents, s, useEngine, validate } from "rig";
import { sh } from "rig/sh";
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
  it("collects intents from nested input", () => {
    const input = {
      diff: sh.text("git diff"),
      result: sh.result("npm test", { cwd: "/tmp/workspace" }),
    };

    const { value, intents } = collectIntents(input);
    expect(intents).toHaveLength(2);
    expect(intents[0]?.mode).toBe("sh.text");
    expect(intents[1]?.mode).toBe("sh.result");
    expect(value).toEqual({
      diff: { $intent: intents[0]?.id },
      result: { $intent: intents[1]?.id },
    });
  });

  it("strips AbortSignal from sh options", () => {
    const controller = new AbortController();
    const intent = sh.text("echo hi", { cwd: "/tmp", signal: controller.signal });

    expect(intent.options).toEqual({ cwd: "/tmp" });
  });
});
