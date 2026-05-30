import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it, vi } from "vitest";
import { agent, s } from "rig";

const mocks = vi.hoisted(() => ({
  copilotEngine: vi.fn(() => ({
    createSession() {
      return {
        async send(): Promise<string> {
          return JSON.stringify({ text: "default-mounted" });
        },
      };
    },
  })),
}));

vi.mock("./engines/copilot.ts", () => ({
  copilotEngine: mocks.copilotEngine,
}));

import { launchRigProgram } from "../skills/rig/rig.ts";

it("uses the launcher cwd when mounting the default copilot engine", async () => {
  const cwd = "/tmp/workspace/pelikhan/rig/src";
  const fixturePath = resolve(dirname(fileURLToPath(import.meta.url)), "./launcher.fixture.ts");

  await launchRigProgram(fixturePath, { cwd });

  expect(mocks.copilotEngine).toHaveBeenCalledWith({ workingDirectory: cwd });

  const call = agent({
    name: "launcher-default-engine-test",
    input: s.object({}),
    output: s.object({ text: s.string }),
  });
  const result = await call({});
  expect(result).toEqual({ text: "default-mounted" });
});
