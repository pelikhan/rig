import { beforeEach, expect, it, vi } from "vitest";

const { createSession, CopilotClient } = vi.hoisted(() => {
  const createSession = vi.fn();
  const CopilotClient = vi.fn(class {
    createSession = createSession;
  });
  return { createSession, CopilotClient };
});

vi.mock("@github/copilot-sdk", () => ({ CopilotClient }));

import { copilotEngine } from "./copilot.ts";

beforeEach(() => {
  createSession.mockReset();
  CopilotClient.mockClear();
  vi.restoreAllMocks();
});

it("subscribes to all Copilot SDK events and logs JSONL", async () => {
  const on = vi.fn((handler: (event: unknown) => void) => {
    handler({ type: "session.idle", data: { done: true } });
    return () => {};
  });
  const sendAndWait = vi.fn().mockResolvedValue({ data: { content: "ok" } });
  createSession.mockResolvedValue({ on, sendAndWait });
  const log = vi.spyOn(console, "log").mockImplementation(() => {});

  const session = copilotEngine().createSession({ model: "gpt-4.1" });
  await expect(session.send("hello", {})).resolves.toBe("ok");

  expect(CopilotClient).toHaveBeenCalledTimes(1);
  expect(createSession).toHaveBeenCalledTimes(1);
  expect(on).toHaveBeenCalledTimes(1);
  expect(log).toHaveBeenCalledWith(JSON.stringify({ source: "copilot-sdk", event: { type: "session.idle", data: { done: true } } }));
});

it("creates and subscribes only once per engine session", async () => {
  const on = vi.fn(() => () => {});
  const sendAndWait = vi.fn().mockResolvedValue({ data: { content: "ok" } });
  createSession.mockResolvedValue({ on, sendAndWait });

  const session = copilotEngine().createSession({ model: "gpt-4.1" });
  await session.send("first", {});
  await session.send("second", {});

  expect(createSession).toHaveBeenCalledTimes(1);
  expect(on).toHaveBeenCalledTimes(1);
  expect(sendAndWait).toHaveBeenCalledTimes(2);
});
