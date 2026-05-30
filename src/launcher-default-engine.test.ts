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

it("uses COPILOT_SDK_URI when mounting the default copilot engine", async () => {
  const sendAndWait = vi.fn().mockResolvedValue(JSON.stringify({ text: "env-mounted" }));
  mocks.createSession.mockResolvedValue({ sendAndWait });
  process.env["COPILOT_SDK_URI"] = "http://127.0.0.1:4141";
  mocks.forUri.mockImplementation(((url: string) => ({ kind: "uri", url })) as any);

  const fixturePath = resolve(dirname(fileURLToPath(import.meta.url)), "./launcher.fixture.ts");

  try {
    await launchRigProgram(fixturePath);

    const call = agent({
      name: "launcher-default-engine-uri-test",
      input: s.object({}),
      output: s.object({ text: s.string }),
    });
    const result = await call({});
    expect(result).toEqual({ text: "env-mounted" });
    expect(mocks.forUri).toHaveBeenCalledWith("http://127.0.0.1:4141");
    expect(mocks.copilotClientCtor).toHaveBeenCalledWith(
      expect.objectContaining({
        connection: { kind: "uri", url: "localhost:0" },
      }),
    );
  } finally {
    delete process.env["COPILOT_SDK_URI"];
    mocks.forUri.mockImplementation(() => ({ kind: "uri", url: "localhost:0" }));
  }
});
