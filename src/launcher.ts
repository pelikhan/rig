import { basename, isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { copilotEngine } from "./engines/copilot.ts";
import type { Engine } from "./rig.ts";
import { useEngine } from "./rig.ts";

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
  const engine = options.engine ?? copilotEngine({ workingDirectory: cwd });
  const resolvedPath = isAbsolute(programPath) ? programPath : resolve(cwd, programPath);

  useEngine(engine);
  await import(pathToFileURL(resolvedPath).href);
}

export async function runLauncherCli(
  argv: string[] = process.argv.slice(2),
  options: LaunchOptions = {},
): Promise<void> {
  const programPath = argv[0];
  if (!programPath) {
    const scriptName = process.argv[1] ? basename(process.argv[1]) : "launcher";
    throw new Error(`Usage: ${scriptName} <program-file>`);
  }
  await launchRigProgram(programPath, options);
}

const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) {
  runLauncherCli().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
