import { expect, it } from "vitest";
import { resolve, dirname } from "node:path";
import { Readable, Writable } from "node:stream";
import { fileURLToPath } from "node:url";
import { agent, s } from "rig";
import type { Engine } from "rig";
import { launchRigProgram, runLauncherCli } from "rig/launcher";

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

it("supports cli mode with argv", async () => {
  const fixturePath = resolve(dirname(fileURLToPath(import.meta.url)), "./launcher.fixture.ts");

  await runLauncherCli([fixturePath], { engine: mockEngine({ text: "cli-mounted" }) });

  const call = agent({
    name: "launcher-cli-test",
    input: s.object({}),
    output: s.object({ text: s.string }),
  });
  const result = await call({});
  expect(result).toEqual({ text: "cli-mounted" });
});

it("supports stdin mode and writes the final answer to stdout", async () => {
  const stdin = Readable.from(["Review this patch"]);
  const output: string[] = [];
  const stdout = new Writable({
    write(chunk, _encoding, callback) {
      output.push(chunk.toString());
      callback();
    },
  });

  await runLauncherCli(["--stdin"], { engine: mockEngine({ text: "done" }) }, { stdin, stdout });

  expect(output.join("")).toBe("{\"text\":\"done\"}");
});

it("requires a program path in cli mode", async () => {
  const originalArgv1 = process.argv[1];
  process.argv[1] = "/tmp/launcher.ts";
  try {
    await expect(runLauncherCli([], { engine: mockEngine({ text: "ignored" }) })).rejects.toThrow(
      "Usage: launcher.ts [<program-file> | --stdin]",
    );
  } finally {
    process.argv[1] = originalArgv1;
  }
});
