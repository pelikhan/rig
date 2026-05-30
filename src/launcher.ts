import { isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { copilotEngine } from "./engines/copilot.js";
import type { Engine } from "./rig.js";
import { useEngine } from "./rig.js";

export type LaunchOptions = {
  cwd?: string;
  engine?: Engine;
};

/**
 * Mounts an engine and executes a rig program file.
 * Relative paths are resolved from `options.cwd` (or process cwd).
 */
export async function launchRigProgram(programPath: string, options: LaunchOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  const engine = options.engine ?? copilotEngine();
  const resolvedPath = isAbsolute(programPath) ? programPath : resolve(cwd, programPath);

  useEngine(engine);
  await import(pathToFileURL(resolvedPath).href);
}
