import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const createSession = vi.fn();
  const copilotClientCtor = vi.fn();
  const forUri = vi.fn(() => ({ kind: "uri", url: "localhost:0" }));
  const CopilotClient = function (this: unknown, options: unknown) {
    copilotClientCtor(options);
    return { createSession };
  };
  return { createSession, copilotClientCtor, forUri, CopilotClient };
});

vi.mock("@github/copilot-sdk", () => ({
  CopilotClient: mocks.CopilotClient,
  RuntimeConnection: { forUri: mocks.forUri, forStdio: vi.fn() },
}));

import { agent, launchRigProgram, s } from "rig";

it("uses the launcher cwd when mounting the default copilot engine", async () => {
  const sendAndWait = vi.fn().mockResolvedValue(JSON.stringify({ text: "default-mounted" }));
  mocks.createSession.mockResolvedValue({ sendAndWait });

  const cwd = "/tmp/workspace/pelikhan/rig/src";
  const fixturePath = resolve(dirname(fileURLToPath(import.meta.url)), "./launcher.fixture.ts");

  await launchRigProgram(fixturePath, { cwd });

  const call = agent({
    name: "launcher-default-engine-test",
    input: s.object({}),
    output: s.object({ text: s.string }),
  });
  const result = await call({});
  expect(result).toEqual({ text: "default-mounted" });
  expect(mocks.copilotClientCtor).toHaveBeenCalledWith(expect.objectContaining({ workingDirectory: cwd }));
});
