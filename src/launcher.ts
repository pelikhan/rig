import { basename, isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { copilotEngine } from "./engines/copilot.ts";
import type { Engine } from "./rig.ts";
import { useEngine } from "./rig.ts";

export type LaunchOptions = {
  cwd?: string;
  engine?: Engine;
};

export type LauncherIo = {
  stdin: NodeJS.ReadableStream;
  stdout: NodeJS.WritableStream;
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

async function readStdin(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: string[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === "string" ? chunk : chunk.toString());
  }
  return chunks.join("");
}

async function runPromptFromStdin(options: LaunchOptions = {}, io: LauncherIo, scriptName: string): Promise<void> {
  const prompt = await readStdin(io.stdin);
  if (!prompt.trim()) {
    throw new Error(`Usage: ${scriptName} [<program-file> | --stdin]`);
  }

  const cwd = options.cwd ?? process.cwd();
  const engine = options.engine ?? copilotEngine({ workingDirectory: cwd });
  const session = engine.createSession({ model: "gpt-4.1" });
  const answer = await session.send(prompt, {});
  io.stdout.write(answer);
}

export async function runLauncherCli(
  argv: string[] = process.argv.slice(2),
  options: LaunchOptions = {},
  io: LauncherIo = process,
): Promise<void> {
  const programPath = argv[0];
  const scriptName = process.argv[1] ? basename(process.argv[1]) : "launcher";
  if (!programPath) {
    throw new Error(`Usage: ${scriptName} [<program-file> | --stdin]`);
  }
  if (programPath === "--stdin") {
    await runPromptFromStdin(options, io, scriptName);
    return;
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
