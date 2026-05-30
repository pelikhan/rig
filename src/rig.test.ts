import { beforeEach, describe, expect, it } from "vitest";
import { AgentError, agent, p, s, useEngine } from "rig";
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

  it("rejects implicit schema syntax at runtime", () => {
    expect(() => agent({
      name: "implicit-top-level",
      input: { text: "go" } as any,
    })).toThrow(/Use declarative s\.\* schema helpers/);

    expect(() => agent({
      name: "implicit-nested",
      input: s.object({ text: "go" as any }),
    })).toThrow(/input\.text/);
  });

  it("does not expose deprecated hook APIs in core", () => {
    expect((agent as { on?: unknown }).on).toBeUndefined();
    expect((agent as { use?: unknown }).use).toBeUndefined();
  });

  it("does not expose lifecycle subscription APIs on agents", () => {
    const myAgent = agent({ name: "test-agent" }) as { subscribe?: unknown };
    expect(myAgent.subscribe).toBeUndefined();
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
      status: p.bash("git status --short"),
      diff: p.result("git diff --stat", { cwd: "/tmp/workspace" }),
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
      instructions: p`Review the repo using ${p.bash("git status --short", { cwd: "/tmp/workspace" })} before answering.`,
      output: s.object({ text: s.string }),
    });

    await inspect({ text: "go" });

    expect(prompts[0]).toContain("Review the repo using Run bash command and return stdout as text: git status --short");
    expect(prompts[0]).toContain("Options:");
    expect(prompts[0]).toContain("/tmp/workspace");
    expect(prompts[0]).toContain("before answering.");
  });
});

describe("shell intents", () => {
  it("exports shell helpers from p and hides internal helpers", async () => {
    const compat = await import("rig");
    expect(compat.p.read("README.md").mode).toBe("sh.read");
    expect(compat.p.bash("git status --short").mode).toBe("sh.text");
    expect(typeof compat.p).toBe("function");
    expect((compat as Record<string, unknown>)["sh"]).toBeUndefined();
    expect((compat as Record<string, unknown>)["validate"]).toBeUndefined();
    expect((compat as Record<string, unknown>)["collectIntents"]).toBeUndefined();
  });

  it("creates shell intents via p helpers", () => {
    const diff = p.bash("git diff");
    const result = p.result("npm test", { cwd: "/tmp/workspace" });
    const readme = p.read("README.md");

    expect(diff.mode).toBe("sh.text");
    expect(result.mode).toBe("sh.result");
    expect(result.options).toEqual({ cwd: "/tmp/workspace" });
    expect(readme.mode).toBe("sh.read");
  });

  it("strips AbortSignal from sh options", () => {
    const controller = new AbortController();
    const intent = p.bash("echo hi", { cwd: "/tmp", signal: controller.signal });

    expect(intent.options).toEqual({ cwd: "/tmp" });
  });
});
