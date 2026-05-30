import { expect, it } from "vitest";
import { resolve, dirname } from "node:path";
import { Readable, Writable } from "node:stream";
import { fileURLToPath } from "node:url";
import { agent, s } from "rig";
import type { Engine } from "rig";
import { launchRigProgram, runLauncherCli } from "rig";

function mockEngine(response: unknown): Engine {
  return {
    createSession() {
      return {
        async send(): Promise<string> {
          return JSON.stringify(response);
        },
      };
    },
  };
}

it("loads a rig program and mounts the provided engine", async () => {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const globalState = globalThis as { __launcherLoaded?: number };
  const before = globalState.__launcherLoaded ?? 0;
  const fixturePath = resolve(__dirname, "./launcher.fixture.ts");

  await launchRigProgram(fixturePath, { engine: mockEngine({ text: "mounted" }) });

  expect(globalState.__launcherLoaded).toBe(before + 1);

  const call = agent({
    name: "launcher-test",
    input: s.object({}),
    output: s.object({ text: s.string }),
  });
  const result = await call({});
  expect(result).toEqual({ text: "mounted" });
});

it("supports file mode with argv", async () => {
  const fixturePath = resolve(dirname(fileURLToPath(import.meta.url)), "./launcher.fixture.ts");

  await runLauncherCli([fixturePath, "--file"], { engine: mockEngine({ text: "cli-mounted" }) });

  const call = agent({
    name: "launcher-cli-test",
    input: s.object({}),
    output: s.object({ text: s.string }),
  });
  const result = await call({});
  expect(result).toEqual({ text: "cli-mounted" });
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

  await runLauncherCli([fixturePath], { engine: mockEngine({ text: "done" }) }, { stdin, stdout });

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

  await runLauncherCli([fixturePath], { engine: mockEngine("done") }, { stdin, stdout });

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

  await runLauncherCli([fixturePath], { engine: mockEngine({ ok: true }) }, { stdin, stdout });

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
    runLauncherCli([fixturePath], { engine: mockEngine({ ok: true }) }, { stdin, stdout }),
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
    runLauncherCli([fixturePath], { engine: mockEngine({ text: "ignored" }) }, { stdin, stdout }),
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
    runLauncherCli([fixturePath], { engine: mockEngine({ text: "ignored" }) }, { stdin, stdout }),
  ).rejects.toThrow(/<program-file> \[--file\]/);
});

it("rejects unknown cli arguments", async () => {
  const fixturePath = resolve(dirname(fileURLToPath(import.meta.url)), "./launcher.fixture.ts");

  await expect(runLauncherCli([fixturePath, "--stdin"], { engine: mockEngine({ text: "ignored" }) })).rejects.toThrow(
    /<program-file> \[--file\]/,
  );
});

it("requires a program path in cli mode", async () => {
  await expect(runLauncherCli([], { engine: mockEngine({ text: "ignored" }) })).rejects.toThrow(
    /<program-file> \[--file\]/,
  );
});
