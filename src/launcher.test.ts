import { expect, it } from "vitest";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { agent, s } from "rig";
import type { Engine } from "rig";
import { launchRigProgram } from "rig/launcher";

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
