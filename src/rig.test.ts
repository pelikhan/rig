import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  let sendAndWaitImpl: (request: { prompt: string; signal?: AbortSignal }) => unknown | Promise<unknown> = async () => ({ text: "default" });
  let onImpl: ((handler: (event: unknown) => void) => void) | undefined;

  const createSession = vi.fn(async () => ({
    on: onImpl ? ((handler: (event: unknown) => void) => {
      onImpl?.(handler);
      return () => {};
    }) : undefined,
    sendAndWait: async (request: { prompt: string; signal?: AbortSignal }) => {
      const response = await sendAndWaitImpl(request);
      return typeof response === "string" ? response : JSON.stringify(response);
    },
  }));
  const forUri = vi.fn(() => ({ kind: "uri", url: "localhost:7777" }));
  const forStdio = vi.fn(() => ({ kind: "stdio" }));
  const copilotClientCtor = vi.fn();
  const CopilotClient = function (this: unknown, options: unknown) {
    copilotClientCtor(options);
    return { createSession };
  };
  const setSendAndWaitImpl = (impl: (request: { prompt: string; signal?: AbortSignal }) => unknown | Promise<unknown>) => {
    sendAndWaitImpl = impl;
  };
  const setOnImpl = (impl?: (handler: (event: unknown) => void) => void) => {
    onImpl = impl;
  };
  return { createSession, forUri, forStdio, copilotClientCtor, CopilotClient, setSendAndWaitImpl, setOnImpl };
});

vi.mock("@github/copilot-sdk", () => ({
  CopilotClient: mocks.CopilotClient,
  RuntimeConnection: { forUri: mocks.forUri, forStdio: mocks.forStdio },
}));

import { AgentError, agent, p, s } from "rig";
import type { RigEvent } from "rig";

beforeEach(() => {
  mocks.createSession.mockClear();
  mocks.forUri.mockClear();
  mocks.forStdio.mockClear();
  mocks.copilotClientCtor.mockClear();
  mocks.setOnImpl(undefined);
  mocks.setSendAndWaitImpl(async () => ({ text: "default" }));
  vi.restoreAllMocks();
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
    mocks.setSendAndWaitImpl(async () => ({
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

  it("exposes subscribe on the returned agent function", () => {
    const myAgent = agent({ name: "test-subscribe" });
    expect(typeof myAgent.subscribe).toBe("function");
  });
});

describe("agent invocation", () => {
  it("calls the copilot sdk and returns validated data", async () => {
    mocks.setSendAndWaitImpl(async () => ({ text: "hello world" }));
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

    mocks.setSendAndWaitImpl(async ({ prompt }) => {
      prompts.push(prompt);
      calls += 1;
      return calls === 1 ? "not json" : { text: "repaired" };
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

    mocks.setSendAndWaitImpl(async ({ prompt }) => {
      prompts.push(prompt);
      calls += 1;
      return calls === 1 ? { wrong: true } : { text: "fixed" };
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
    mocks.setSendAndWaitImpl(async () => "not json");

    const strict = agent({
      name: "strict",
      repair: false,
    });

    await expect(strict({ text: "go" })).rejects.toBeInstanceOf(AgentError);
    await expect(strict({ text: "go" })).rejects.toMatchObject({ kind: "parse" });
  });

  it("supports per-call model overrides", async () => {
    mocks.setSendAndWaitImpl(async () => ({ text: "ok" }));

    const call = agent({ name: "model-test", model: "gpt-4.1" });
    await call({ text: "x" }, { model: "o3-mini" });

    expect(mocks.createSession).toHaveBeenCalledWith({ model: "o3-mini", streaming: false });
  });

  it("supports timeout and abort signals", async () => {
    mocks.setSendAndWaitImpl(async ({ signal }) => {
      await new Promise((_, reject) => {
        signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
        setTimeout(() => reject(new Error("should have aborted")), 5000);
      });
      return "";
    });

    const slow = agent({ name: "timeout-test" });
    await expect(slow({ text: "go" }, { timeout: 50 })).rejects.toThrow(/Timed out/);
  });

  it("inlines shell prompts and omits top-level prompt metadata", async () => {
    const prompts: string[] = [];

    mocks.setSendAndWaitImpl(async ({ prompt }) => {
      prompts.push(prompt);
      return { text: "ok" };
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

    mocks.setSendAndWaitImpl(async ({ prompt }) => {
      prompts.push(prompt);
      return { text: "ok" };
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

describe("subscribe", () => {
  it("fires call and result events on a successful run", async () => {
    mocks.setSendAndWaitImpl(async () => ({ text: "hello" }));
    const events: RigEvent[] = [];
    const myAgent = agent({ name: "observable", output: s.object({ text: s.string }) });
    myAgent.subscribe((e) => { events.push(e); });

    await myAgent({ text: "go" });

    expect(events.map((e) => e.type)).toEqual(["call", "send", "response", "result"]);
    expect(events[0]).toMatchObject({ type: "call", agent: "observable" });
    expect(events[3]).toMatchObject({ type: "result", agent: "observable", output: { text: "hello" } });
  });

  it("fires error event on failure and re-throws", async () => {
    mocks.setSendAndWaitImpl(async () => "not json");
    const events: RigEvent[] = [];
    const strict = agent({ name: "strict", repair: false });
    strict.subscribe((e) => { events.push(e); });

    await expect(strict({ text: "go" })).rejects.toBeInstanceOf(AgentError);
    expect(events.some((e) => e.type === "error")).toBe(true);
  });

  it("fires send and response events for each repair turn", async () => {
    let calls = 0;
    mocks.setSendAndWaitImpl(async () => {
      calls += 1;
      return calls === 1 ? "bad json" : { text: "ok" };
    });
    const events: RigEvent[] = [];
    const repairable = agent({ name: "repairable", maxTurns: 2 });
    repairable.subscribe((e) => { events.push(e); });

    await repairable({ text: "go" });

    const sends = events.filter((e) => e.type === "send");
    const responses = events.filter((e) => e.type === "response");
    expect(sends.length).toBe(2);
    expect(responses.length).toBe(2);
  });

  it("unsubscribes correctly", async () => {
    mocks.setSendAndWaitImpl(async () => ({ text: "hi" }));
    const events: RigEvent[] = [];
    const myAgent = agent({ name: "unsub-test" });
    const unsub = myAgent.subscribe((e) => { events.push(e); });

    unsub();
    await myAgent({ text: "go" });

    expect(events).toHaveLength(0);
  });

  it("supports async listeners", async () => {
    mocks.setSendAndWaitImpl(async () => ({ text: "hi" }));
    const log: string[] = [];
    const myAgent = agent({ name: "async-listener" });
    myAgent.subscribe(async (e) => {
      await Promise.resolve();
      log.push(e.type);
    });

    await myAgent({ text: "go" });
    expect(log).toContain("result");
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
