import { basename, isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { copilotEngine } from "./engines/copilot.ts";
import type { AgentFn, Engine } from "./rig.ts";
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

function asRootAgent(value: unknown): AgentFn | undefined {
  if (typeof value !== "function") {
    return undefined;
  }
  const candidate = value as Partial<AgentFn>;
  if (!candidate.inputSchema || !candidate.outputSchema) {
    return undefined;
  }
  return value as AgentFn;
}

function coerceStdinInput(agentFn: AgentFn, text: string): unknown {
  const schema = agentFn.inputSchema;
  if (schema.kind === "string") {
    return text;
  }
  if (schema.kind === "object" && "text" in schema.fields) {
    return { text };
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Expected stdin to contain JSON for the root agent input schema.");
  }
}

function renderStdout(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (
    value
    && typeof value === "object"
    && "text" in value
    && typeof (value as { text: unknown }).text === "string"
  ) {
    return (value as { text: string }).text;
  }
  return JSON.stringify(value);
}

async function runRootAgentFromStdin(
  programPath: string,
  options: LaunchOptions = {},
  io: LauncherIo,
  scriptName: string,
): Promise<void> {
  const prompt = await readStdin(io.stdin);
  if (!prompt.trim()) {
    throw new Error(`Usage: ${scriptName} <program-file> [--stdin]`);
  }

  const cwd = options.cwd ?? process.cwd();
  const engine = options.engine ?? copilotEngine({ workingDirectory: cwd });
  const resolvedPath = isAbsolute(programPath) ? programPath : resolve(cwd, programPath);

  useEngine(engine);
  const mod = await import(pathToFileURL(resolvedPath).href);
  const rootAgent = asRootAgent(mod.default);
  if (!rootAgent) {
    throw new Error("Expected program to export a root agent as default export.");
  }

  const result = await rootAgent(coerceStdinInput(rootAgent, prompt));
  io.stdout.write(renderStdout(result));
}

export async function runLauncherCli(
  argv: string[] = process.argv.slice(2),
  options: LaunchOptions = {},
  io: LauncherIo = process,
): Promise<void> {
  const programPath = argv[0];
  const useStdin = argv.includes("--stdin");
  const scriptName = process.argv[1] ? basename(process.argv[1]) : "launcher";
  if (!programPath) {
    throw new Error(`Usage: ${scriptName} <program-file> [--stdin]`);
  }
  if (useStdin) {
    await runRootAgentFromStdin(programPath, options, io, scriptName);
  } else {
    await launchRigProgram(programPath, options);
  }
}

const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) {
  runLauncherCli().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
