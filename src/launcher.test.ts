import { beforeEach, expect, it, vi } from "vitest";
import { resolve, dirname } from "node:path";
import { Readable, Writable } from "node:stream";
import { fileURLToPath } from "node:url";

const mocks = vi.hoisted(() => {
  let sendAndWaitImpl: () => unknown | Promise<unknown> = async () => ({ text: "done" });
  const createSession = vi.fn(async () => ({
    sendAndWait: async () => {
      const response = await sendAndWaitImpl();
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
  const setSendAndWaitImpl = (impl: () => unknown | Promise<unknown>) => {
    sendAndWaitImpl = impl;
  };
  return { createSession, forUri, forStdio, copilotClientCtor, CopilotClient, setSendAndWaitImpl };
});

vi.mock("@github/copilot-sdk", () => ({
  CopilotClient: mocks.CopilotClient,
  RuntimeConnection: { forUri: mocks.forUri, forStdio: mocks.forStdio },
}));

import { agent, s } from "rig";
import { launchRigProgram, runLauncherCli } from "rig";

beforeEach(() => {
  mocks.createSession.mockClear();
  mocks.forUri.mockClear();
  mocks.forStdio.mockClear();
  mocks.copilotClientCtor.mockClear();
  mocks.setSendAndWaitImpl(async () => ({ text: "done" }));
});

it("loads a rig program and mounts a copilot client", async () => {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const globalState = globalThis as { __launcherLoaded?: number };
  const before = globalState.__launcherLoaded ?? 0;
  const fixturePath = resolve(__dirname, "./launcher.fixture.ts");

  mocks.setSendAndWaitImpl(async () => ({ text: "mounted" }));
  await launchRigProgram(fixturePath);

  expect(globalState.__launcherLoaded).toBe(before + 1);

  const call = agent({
    name: "launcher-test",
    input: s.object({}),
    output: s.object({ text: s.string }),
  });
  const result = await call({});
  expect(result).toEqual({ text: "mounted" });
});

it("uses stdin mode by default and writes the final answer to stdout", async () => {
  const fixturePath = resolve(dirname(fileURLToPath(import.meta.url)), "./launcher.stdin.fixture.ts");
  const stdin = Readable.from(["Review this patch"]);
  const output: string[] = [];
  const stdout = new Writable({
    write(chunk, _encoding, callback) {
      output.push(chunk.toString());
      callback();
    },
  });

  mocks.setSendAndWaitImpl(async () => ({ text: "done" }));
  await runLauncherCli([fixturePath], {}, { stdin, stdout });

  expect(output.join("")).toBe("done");
});

it("supports stdin mode for string input/output root agents", async () => {
  const fixturePath = resolve(dirname(fileURLToPath(import.meta.url)), "./launcher.stdin-string.fixture.ts");
  const stdin = Readable.from(["Review this patch"]);
  const output: string[] = [];
  const stdout = new Writable({
    write(chunk, _encoding, callback) {
      output.push(chunk.toString());
      callback();
    },
  });

  mocks.setSendAndWaitImpl(async () => JSON.stringify("done"));
  await runLauncherCli([fixturePath], {}, { stdin, stdout });

  expect(output.join("")).toBe("done");
});

it("supports stdin mode for JSON input and JSON stdout output", async () => {
  const fixturePath = resolve(dirname(fileURLToPath(import.meta.url)), "./launcher.stdin-json.fixture.ts");
  const stdin = Readable.from(["{\"message\":\"hello\"}"]);
  const output: string[] = [];
  const stdout = new Writable({
    write(chunk, _encoding, callback) {
      output.push(chunk.toString());
      callback();
    },
  });

  mocks.setSendAndWaitImpl(async () => ({ ok: true }));
  await runLauncherCli([fixturePath], {}, { stdin, stdout });

  expect(output.join("")).toBe("{\"ok\":true}");
});

it("rejects stdin mode when root agent expects JSON input but stdin is not JSON", async () => {
  const fixturePath = resolve(dirname(fileURLToPath(import.meta.url)), "./launcher.stdin-json.fixture.ts");
  const stdin = Readable.from(["not-json"]);
  const stdout = new Writable({
    write(_chunk, _encoding, callback) {
      callback();
    },
  });

  await expect(
    runLauncherCli([fixturePath], {}, { stdin, stdout }),
  ).rejects.toThrow("Expected stdin to contain JSON for the root agent input schema.");
});

it("requires stdin-mode root agent to be a default export", async () => {
  const fixturePath = resolve(dirname(fileURLToPath(import.meta.url)), "./launcher.stdin-named-root.fixture.ts");
  const stdin = Readable.from(["Review this patch"]);
  const stdout = new Writable({
    write(_chunk, _encoding, callback) {
      callback();
    },
  });

  await expect(
    runLauncherCli([fixturePath], {}, { stdin, stdout }),
  ).rejects.toThrow("Expected program to export a root agent as default export.");
});

it("rejects stdin mode when prompt is empty", async () => {
  const fixturePath = resolve(dirname(fileURLToPath(import.meta.url)), "./launcher.stdin.fixture.ts");
  const stdin = Readable.from(["   \n\t"]);
  const stdout = new Writable({
    write(_chunk, _encoding, callback) {
      callback();
    },
  });
  await expect(
    runLauncherCli([fixturePath], {}, { stdin, stdout }),
  ).rejects.toThrow(/<program-file>/);
});

it("rejects unknown cli arguments", async () => {
  const fixturePath = resolve(dirname(fileURLToPath(import.meta.url)), "./launcher.fixture.ts");

  await expect(runLauncherCli([fixturePath, "--file"])).rejects.toThrow(
    /<program-file>/,
  );
});

it("accepts --server flag without rejecting", async () => {
  const fixturePath = resolve(dirname(fileURLToPath(import.meta.url)), "./launcher.stdin.fixture.ts");
  const stdin = Readable.from(["Review this patch"]);
  const output: string[] = [];
  const stdout = new Writable({
    write(chunk, _encoding, callback) {
      output.push(chunk.toString());
      callback();
    },
  });

  await runLauncherCli([fixturePath, "--server"], {}, { stdin, stdout });

  expect(output.join("")).toBe("done");
  expect(mocks.forStdio).toHaveBeenCalled();
});

it("runs a program piped on stdin when no program path is provided", async () => {
  const stdin = Readable.from([`
import { agent, s } from "rig";

const root = agent({
  name: "launcher-stdin-program",
  input: s.object({ text: s.string }),
  output: s.object({ text: s.string }),
});

const result = await root({ text: "Review this patch" });
(globalThis as { __launcherStdinProgramResult?: string }).__launcherStdinProgramResult = result.text;
`]);
  const globalState = globalThis as { __launcherStdinProgramResult?: string };
delete globalState.__launcherStdinProgramResult;
  const stdout = new Writable({
    write(_chunk, _encoding, callback) {
      callback();
    },
  });

  mocks.setSendAndWaitImpl(async () => ({ text: "done" }));
  await runLauncherCli([], {}, { stdin, stdout });

  expect(globalState.__launcherStdinProgramResult).toBe("done");
});

it("requires a non-empty stdin program when no program path is provided", async () => {
  const stdin = Readable.from(["  \n\t"]);
  const stdout = new Writable({
    write(_chunk, _encoding, callback) {
      callback();
    },
  });

  await expect(runLauncherCli([], {}, { stdin, stdout })).rejects.toThrow(
    /<program-file>/,
  );
});
