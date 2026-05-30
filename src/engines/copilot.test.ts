import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const createSession = vi.fn();
  const forTcp = vi.fn(() => ({ kind: "tcp", port: 0 }));
  const copilotClientCtor = vi.fn();
  const CopilotClient = function (this: unknown, options: unknown) {
    copilotClientCtor(options);
    return { createSession };
  };
  return { createSession, forTcp, copilotClientCtor, CopilotClient };
});

vi.mock("@github/copilot-sdk", () => ({
  CopilotClient: mocks.CopilotClient,
  RuntimeConnection: { forTcp: mocks.forTcp },
}));

import { copilotEngine } from "./copilot.ts";

beforeEach(() => {
  mocks.createSession.mockReset();
  mocks.forTcp.mockClear();
  mocks.forTcp.mockImplementation(() => ({ kind: "tcp", port: 0 }));
  mocks.copilotClientCtor.mockClear();
  vi.restoreAllMocks();
});

it("uses a TCP server connection by default", async () => {
  const sendAndWait = vi.fn().mockResolvedValue({ text: "server-mode" });
  mocks.createSession.mockResolvedValue({ sendAndWait });

  const session = copilotEngine().createSession({ model: "gpt-5" });

  await expect(session.send("hello", {})).resolves.toBe("server-mode");
  expect(mocks.forTcp).toHaveBeenCalledOnce();
  expect(mocks.copilotClientCtor).toHaveBeenCalledWith({ connection: { kind: "tcp", port: 0 } });
  expect(mocks.createSession).toHaveBeenCalledWith({ model: "gpt-5", streaming: false });
});

it("preserves explicit client options", async () => {
  const connection = { kind: "uri", url: "127.0.0.1:8765" } as const;

  copilotEngine({ connection, workingDirectory: "/tmp/rig" });

  expect(mocks.forTcp).not.toHaveBeenCalled();
  expect(mocks.copilotClientCtor).toHaveBeenCalledWith({
    connection,
    workingDirectory: "/tmp/rig",
  });
});

it("subscribes to all Copilot SDK events and logs JSONL", async () => {
  const on = vi.fn((handler: (event: unknown) => void) => {
    handler({ type: "session.idle", data: { done: true } });
    return () => {};
  });
  const sendAndWait = vi.fn().mockResolvedValue({ data: { content: "ok" } });
  mocks.createSession.mockResolvedValue({ on, sendAndWait });
  const log = vi.spyOn(console, "log").mockImplementation(() => {});

  const session = copilotEngine().createSession({ model: "gpt-4.1" });
  await expect(session.send("hello", {})).resolves.toBe("ok");

  expect(mocks.copilotClientCtor).toHaveBeenCalledTimes(1);
  expect(mocks.createSession).toHaveBeenCalledTimes(1);
  expect(on).toHaveBeenCalledTimes(1);
  expect(log).toHaveBeenCalledWith(JSON.stringify({ source: "copilot-sdk", event: { type: "session.idle", data: { done: true } } }));
});

it("creates and subscribes only once per engine session", async () => {
  const on = vi.fn(() => () => {});
  const sendAndWait = vi.fn().mockResolvedValue({ data: { content: "ok" } });
  mocks.createSession.mockResolvedValue({ on, sendAndWait });

  const session = copilotEngine().createSession({ model: "gpt-4.1" });
  await session.send("first", {});
  await session.send("second", {});

  expect(mocks.createSession).toHaveBeenCalledTimes(1);
  expect(on).toHaveBeenCalledTimes(1);
  expect(sendAndWait).toHaveBeenCalledTimes(2);
});
