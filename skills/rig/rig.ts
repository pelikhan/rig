import { AsyncLocalStorage } from "node:async_hooks";
import { basename, dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { CopilotClient, RuntimeConnection } from "@github/copilot-sdk";
import type { CopilotClientOptions } from "@github/copilot-sdk";

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type ValidationResult = { ok: true } | { ok: false; error: string };

export type StringSchema = { kind: "string"; description?: string };
export type NumberSchema = { kind: "number"; description?: string };
export type BooleanSchema = { kind: "boolean"; description?: string };
export type UnknownSchema = { kind: "unknown"; description?: string };
export type ArraySchema<Item extends Schema = Schema> = { kind: "array"; item: Item; description?: string };
export type ObjectSchema<Fields extends Record<string, Schema> = Record<string, Schema>> = {
  kind: "object";
  fields: Fields;
  description?: string;
};
export type RecordSchema<Value extends Schema = Schema> = { kind: "record"; value: Value; description?: string };
export type EnumSchema<Values extends readonly Json[] = readonly Json[]> = { kind: "enum"; values: Values; description?: string };
export type OptionalSchema<Inner extends Schema = Schema> = { kind: "optional"; inner: Inner; description?: string };

export type Schema =
  | StringSchema
  | NumberSchema
  | BooleanSchema
  | UnknownSchema
  | ArraySchema<any>
  | ObjectSchema<any>
  | RecordSchema<any>
  | EnumSchema<any>
  | OptionalSchema<any>;

type SchemaHelperFactory<T extends Schema> = T & ((description?: string) => T);

function createPrimitiveSchema<T extends Schema>(kind: T["kind"]): SchemaHelperFactory<T> {
  const base = { kind } as T;
  const factory = ((description?: string) => (description === undefined ? base : { ...base, description } as T)) as SchemaHelperFactory<T>;
  return Object.assign(factory, base);
}

type EnumSchemaFactory = {
  <const Values extends readonly Json[]>(...values: Values): EnumSchema<Values>;
  <const Values extends readonly Json[]>(values: Values, description: string): EnumSchema<Values>;
};

const createEnumSchema: EnumSchemaFactory = (...args: unknown[]) => {
  const valuesOrTuple = args as readonly Json[];
  if (
    valuesOrTuple.length === 2
    && Array.isArray(valuesOrTuple[0])
    && typeof valuesOrTuple[1] === "string"
  ) {
    const values = valuesOrTuple[0] as readonly Json[];
    const description = valuesOrTuple[1] as string;
    return { kind: "enum", values, description };
  }
  const values = valuesOrTuple as readonly Json[];
  return { kind: "enum", values };
};

export type Simplify<T> = { [K in keyof T]: T[K] } & {};

export type AgentInputValue<T> =
  T extends readonly (infer Item)[] ? Intent | AgentInputValue<Item>[] :
  T extends object ? Intent | { [K in keyof T]: AgentInputValue<T[K]> } :
  T | Intent;

export type InferSchema<T> =
  T extends { kind: "string" } ? string :
  T extends { kind: "number" } ? number :
  T extends { kind: "boolean" } ? boolean :
  T extends { kind: "unknown" } ? unknown :
  T extends { kind: "array"; item: infer Item } ? InferSchema<Item>[] :
  T extends { kind: "record"; value: infer Value } ? Record<string, InferSchema<Value>> :
  T extends { kind: "enum"; values: infer Values extends readonly unknown[] } ? Values[number] :
  T extends { kind: "optional"; inner: infer Inner } ? InferSchema<Inner> | undefined :
  T extends { kind: "object"; fields: infer Fields extends Record<string, unknown> } ? Simplify<
    & { [K in keyof Fields as Fields[K] extends { kind: "optional" } ? never : K]: InferSchema<Fields[K]> }
    & { [K in keyof Fields as Fields[K] extends { kind: "optional" } ? K : never]?: Fields[K] extends { kind: "optional"; inner: infer Inner } ? InferSchema<Inner> : never }
  > :
  unknown;

export const s = {
  string: createPrimitiveSchema<StringSchema>("string"),
  number: createPrimitiveSchema<NumberSchema>("number"),
  boolean: createPrimitiveSchema<BooleanSchema>("boolean"),
  unknown: createPrimitiveSchema<UnknownSchema>("unknown"),
  array<Item extends Schema>(item: Item, description?: string): ArraySchema<Item> {
    return description === undefined ? { kind: "array", item } : { kind: "array", item, description };
  },
  object<Fields extends Record<string, Schema>>(fields: Fields, description?: string): ObjectSchema<Fields> {
    return description === undefined ? { kind: "object", fields } : { kind: "object", fields, description };
  },
  record<Value extends Schema>(value: Value, description?: string): RecordSchema<Value> {
    return description === undefined ? { kind: "record", value } : { kind: "record", value, description };
  },
  enum: createEnumSchema,
  optional<Inner extends Schema>(inner: Inner, description?: string): OptionalSchema<Inner> {
    return description === undefined ? { kind: "optional", inner } : { kind: "optional", inner, description };
  },
};

const defaultStringSchema = s.string;

export type CopilotEngineOptions = Omit<CopilotClientOptions, "connection"> & {
  connection?: CopilotClientOptions["connection"];
  server?: boolean;
};

function resolveDefaultCopilotUri(): string {
  return process.env["COPILOT_SDK_URI"] ?? "localhost:7777";
}

export function copilotEngine(options: CopilotEngineOptions = {}): CopilotClient {
  const { server, connection, ...clientOptions } = options;
  return new CopilotClient({
    ...clientOptions,
    connection: connection ?? (server ? RuntimeConnection.forStdio() : RuntimeConnection.forUri(resolveDefaultCopilotUri())),
  });
}

function jsonl(value: unknown): string {
  try {
    return JSON.stringify(value, (_, v) => {
      if (typeof v === "bigint") {
        return v.toString();
      }
      if (v instanceof Error) {
        return { name: v.name, message: v.message, stack: v.stack };
      }
      return v;
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return JSON.stringify(rigEvent("logger.error", { error: reason }));
  }
}

function rigEvent(type: string, data?: unknown): { type: string; data?: unknown } {
  return { type: `rig.${type}`, data };
}

function writeEvent(event: unknown): void {
  process.stderr.write(`${jsonl(event)}\n`);
}

export type RepairHandler = false | "default" | ((error: AgentError) => string);
export type CopilotSession = Awaited<ReturnType<CopilotClient["createSession"]>>;
export type AgentMiddlewareContext = {
  spec: AgentSpec<any, any>;
  session: CopilotSession;
  input: unknown;
  outputSchema: Schema;
  turn: number;
  maxTurns: number;
  prompt: string;
  response?: string;
  completed: boolean;
  output?: unknown;
  nextPrompt?: string;
  error?: unknown;
};
export type AgentMiddleware = (
  context: AgentMiddlewareContext,
  next: () => Promise<void>,
) => void | Promise<void>;

export type AgentSpec<Input extends Schema = StringSchema, Output extends Schema = StringSchema> = {
  name: string;
  instructions?: string;
  input?: Input;
  output?: Output;
  model?: string;
  timeout?: number;
  maxTurns?: number;
  repair?: RepairHandler;
  middleware?: AgentMiddleware | AgentMiddleware[];
  agents?: Record<string, AgentFn<any, any>>;
};

export type CallOptions = {
  signal?: AbortSignal;
  timeout?: number;
  model?: string;
  maxTurns?: number;
  middleware?: AgentMiddleware | AgentMiddleware[];
};

export type LaunchOptions = {
  cwd?: string;
  startServer?: boolean;
  typecheck?: boolean;
};

export type LauncherIo = {
  stdin: NodeJS.ReadableStream;
  stdout: NodeJS.WritableStream;
};

export type AgentFn<Input = unknown, Output = unknown> = ((input: AgentInputValue<Input>, options?: CallOptions) => Promise<Output>) & {
  agentName: string;
  inputSchema: Schema;
  outputSchema: Schema;
  inputShape: Schema;
  outputShape: Schema;
  spec: AgentSpec<any, any>;
  _namespace: string;
};

export type IntentOptions = {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  purpose?: string;
  signal?: AbortSignal;
};

export type Intent = {
  __rig: "sh";
  id: string;
  mode: "sh.text" | "sh.result" | "sh.read" | "sh.write";
  command?: string;
  path?: string;
  contents?: string;
  options?: Omit<IntentOptions, "signal">;
};

let nextIntentId = 1;

type PromptHelpers = {
  (strings: TemplateStringsArray, ...values: unknown[]): string;
  bash(command: string, options?: IntentOptions): Intent;
  result(command: string, options?: IntentOptions): Intent;
  read(path: string, options?: IntentOptions): Intent;
  write(path: string, contents: string, options?: IntentOptions): Intent;
};

function renderPromptTemplate(strings: TemplateStringsArray, ...values: unknown[]): string {
  let result = strings[0] ?? "";
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    result += isIntent(value) ? renderIntent(value) : String(value);
    result += strings[index + 1] ?? "";
  }
  return result;
}

export const p: PromptHelpers = Object.assign(renderPromptTemplate, {
  bash(command: string, options?: IntentOptions): Intent {
    return createIntent("sh.text", withOptions({ command }, options));
  },
  result(command: string, options?: IntentOptions): Intent {
    return createIntent("sh.result", withOptions({ command }, options));
  },
  read(path: string, options?: IntentOptions): Intent {
    return createIntent("sh.read", withOptions({ path }, options));
  },
  write(path: string, contents: string, options?: IntentOptions): Intent {
    return createIntent("sh.write", withOptions({ path, contents }, options));
  },
});

export class AgentError extends Error {
  readonly kind: "parse" | "validation";
  readonly agent: string;
  readonly turn: number;
  readonly response: string;
  readonly schema: Schema;
  readonly schemaText: string;

  constructor(options: {
    kind: "parse" | "validation";
    agent: string;
    turn: number;
    response: string;
    schema: Schema;
    message: string;
  }) {
    super(options.message);
    this.name = "AgentError";
    this.kind = options.kind;
    this.agent = options.agent;
    this.turn = options.turn;
    this.response = options.response;
    this.schema = options.schema;
    this.schemaText = renderSchema(options.schema);
  }
}

let currentCopilotOptions: CopilotEngineOptions | undefined;
const currentCopilotClient = new AsyncLocalStorage<CopilotClient>();
type CopilotSessionHandle = {
  session: CopilotSession;
  close(): Promise<void>;
};

/**
 * Mounts an engine and executes a rig program file.
 * Relative paths are resolved from `options.cwd` (or process cwd).
 */
export async function launchRigProgram(programPath: string, options: LaunchOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  const resolvedPath = isAbsolute(programPath) ? programPath : resolve(cwd, programPath);

  configureCopilot(resolveCopilotOptions(cwd, options));
  await import(pathToFileURL(resolvedPath).href);
}

async function readStdin(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: string[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === "string" ? chunk : chunk.toString());
  }
  return chunks.join("");
}

function resolveCopilotOptions(cwd: string, options: LaunchOptions): { workingDirectory: string } | { workingDirectory: string; server: true } {
  return options.startServer ? { workingDirectory: cwd, server: true } : { workingDirectory: cwd };
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

function noInputInvocation(agentFn: AgentFn): unknown | undefined {
  const schema = agentFn.inputSchema;
  if (schema.kind === "string") {
    return "";
  }
  if (schema.kind !== "object") {
    return undefined;
  }
  const keys = Object.keys(schema.fields);
  if (keys.length === 0) {
    return {};
  }
  if (
    keys.length === 1
    && "text" in schema.fields
    && schema.fields.text?.kind === "string"
    && schema.fields.text.optional !== true
  ) {
    return { text: "" };
  }
  return undefined;
}

function withInjectedRigImport(programCode: string): string {
  if (/\bfrom\s*["']rig["']/.test(programCode)) {
    return programCode;
  }
  return `import { agent, p, s } from "rig";\n\n${programCode}`;
}

function withInjectedDefaultRootAgent(programCode: string): string {
  if (/\bexport\s+default\b/.test(programCode)) {
    return programCode;
  }
  const firstAgentAssignment = programCode.match(
    /^\s*(?:const|let|var)\s+([$_\p{ID_Start}][$_\p{ID_Continue}]*)\s*=\s*agent\s*\(/mu,
  );
  if (!firstAgentAssignment) {
    return programCode;
  }
  return `${programCode}\n\nexport default ${firstAgentAssignment[1]};\n`;
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

async function typecheckProgram(programPath: string, cwd: string): Promise<void> {
  const execFileAsync = promisify(execFile);
  const skillTsconfigPath = resolve(dirname(fileURLToPath(import.meta.url)), "tsconfig.json");
  const candidateTsconfigPaths = [resolve(cwd, "tsconfig.json"), skillTsconfigPath];
  let baseTsconfigPath: string | undefined;
  for (const tsconfigPath of candidateTsconfigPaths) {
    try {
      await access(tsconfigPath);
      baseTsconfigPath = tsconfigPath;
      break;
    } catch {
      // Try the next candidate.
    }
  }
  if (!baseTsconfigPath) {
    throw new Error(
      `Typecheck mode requires tsconfig.json at one of: ${candidateTsconfigPaths.join(", ")}`,
    );
  }
  const tempRoot = resolve(cwd, ".tmp");
  await mkdir(tempRoot, { recursive: true });
  const tempDir = await mkdtemp(resolve(tempRoot, "rig-typecheck-"));
  const projectPath = resolve(tempDir, "tsconfig.typecheck.json");
  try {
    await writeFile(projectPath, JSON.stringify({
      extends: baseTsconfigPath,
      include: [programPath],
    }), "utf8");
    await execFileAsync(
      "npx",
      ["--yes", "--package", "typescript@5.9.3", "--", "tsc", "--project", projectPath, "--pretty", "false"],
      {
        cwd,
        env: { ...process.env, npm_config_ignore_scripts: "true" },
      },
    );
  } catch (error) {
    const execError = error as NodeJS.ErrnoException & { stdout?: string; stderr?: string };
    if (execError.code === "ENOENT") {
      throw new Error("Typecheck mode requires `npx tsc` to be available in PATH.");
    }
    const diagnostics = [execError.stdout, execError.stderr]
      .filter((entry) => typeof entry === "string" && entry.trim())
      .join("\n")
      .trim();
    const detail = diagnostics ? `\n${diagnostics}` : "";
    throw new Error(`Typecheck failed for ${programPath}.${detail}`);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function runRootAgentFromStdin(
  programPath: string,
  options: LaunchOptions = {},
  io: LauncherIo,
  scriptName: string,
): Promise<void> {
  const prompt = await readStdin(io.stdin);
  if (!prompt.trim()) {
    throw new Error(`Usage: ${scriptName} <program-file>`);
  }

  const cwd = options.cwd ?? process.cwd();
  const resolvedPath = isAbsolute(programPath) ? programPath : resolve(cwd, programPath);
  if (options.typecheck) {
    await typecheckProgram(resolvedPath, cwd);
  }

  configureCopilot(resolveCopilotOptions(cwd, options));
  const mod = await import(pathToFileURL(resolvedPath).href);
  const rootAgent = asRootAgent(mod.default);
  if (!rootAgent) {
    throw new Error("Expected program to export a root agent as default export.");
  }

  const result = await rootAgent(coerceStdinInput(rootAgent, prompt));
  io.stdout.write(renderStdout(result));
}

async function runProgramCodeFromStdin(
  options: LaunchOptions = {},
  io: LauncherIo,
  scriptName: string,
): Promise<void> {
  const programCode = await readStdin(io.stdin);
  if (!programCode.trim()) {
    throw new Error(`Usage: ${scriptName} <program-file> [--server] [--typecheck]`);
  }

  const cwd = options.cwd ?? process.cwd();
  const tempRoot = resolve(cwd, ".tmp");
  await mkdir(tempRoot, { recursive: true });
  const tempDir = await mkdtemp(resolve(tempRoot, "rig-stdin-"));
  const tempProgramPath = resolve(tempDir, "program.ts");
  const transformedProgramCode = withInjectedDefaultRootAgent(withInjectedRigImport(programCode));
  await writeFile(tempProgramPath, transformedProgramCode, "utf8");
  try {
    if (options.typecheck) {
      await typecheckProgram(tempProgramPath, cwd);
    }
    configureCopilot(resolveCopilotOptions(cwd, options));
    const mod = await import(pathToFileURL(tempProgramPath).href);
    const rootAgent = asRootAgent(mod.default);
    if (!rootAgent) {
      throw new Error("Expected program to export a root agent as default export.");
    }
    const input = noInputInvocation(rootAgent);
    if (input === undefined) {
      throw new Error("Expected stdin program root agent to have no input (omit input or use input: s.object({})).");
    }
    const result = await rootAgent(input);
    io.stdout.write(renderStdout(result));
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

const launcherHelpArgs = new Set(["--help", "-h", "help", "/help", "/?"]);

function isLauncherHelpArg(arg: string): boolean {
  return launcherHelpArgs.has(arg.toLowerCase());
}

function renderLauncherUsage(scriptName: string): string {
  return [
    `Usage: ${scriptName} [<program-file>] [--server] [--typecheck]`,
    "",
    "Modes:",
    "  <no program-file>  Read a rig program from stdin and run its default root agent.",
    "  <program-file>     Read root-agent input from stdin and run the program file.",
    "",
    "Help aliases:",
    "  --help, -h, help, /help, /?",
    "",
    "Examples:",
    `  cat ./program.ts | ${scriptName}`,
    `  cat ./program.ts | ${scriptName} --typecheck`,
    `  echo "Summarize this repository" | ${scriptName} src/program.ts`,
  ].join("\n");
}

export async function runLauncherCli(
  argv: string[] = process.argv.slice(2),
  options: LaunchOptions = {},
  io: LauncherIo = process,
): Promise<void> {
  const scriptName = process.argv[1] ? basename(process.argv[1]) : "launcher";
  if (argv.some(isLauncherHelpArg)) {
    io.stdout.write(`${renderLauncherUsage(scriptName)}\n`);
    return;
  }
  const positionalArgs = argv.filter((arg) => !arg.startsWith("--"));
  const flags = argv.filter((arg) => arg.startsWith("--"));
  const serverFlag = flags.includes("--server");
  const typecheckFlag = flags.includes("--typecheck");
  const unknownFlags = flags.filter((f) => f !== "--server" && f !== "--typecheck");
  if (positionalArgs.length > 1 || unknownFlags.length > 0) {
    throw new Error(`Usage: ${scriptName} <program-file> [--server] [--typecheck]`);
  }
  const mergedOptions: LaunchOptions = {
    ...options,
    ...(serverFlag ? { startServer: true } : {}),
    ...(typecheckFlag ? { typecheck: true } : {}),
  };
  if (positionalArgs.length === 1) {
    await runRootAgentFromStdin(positionalArgs[0]!, mergedOptions, io, scriptName);
    return;
  }
  await runProgramCodeFromStdin(mergedOptions, io, scriptName);
}

export function agent<
  const Input extends Schema = StringSchema,
  const Output extends Schema = StringSchema
>(spec: AgentSpec<Input, Output>): AgentFn<InferSchema<Input>, InferSchema<Output>>;
export function agent(spec: AgentSpec<any, any>): AgentFn<any, any> {
  const normalizedSpec = normalizeSpec(spec);
  const inputSchema = normalizedSpec.input ?? defaultStringSchema;
  const outputSchema = normalizedSpec.output ?? defaultStringSchema;

  const fn = (async (input: unknown, options: CallOptions = {}) =>
    withCopilotClient(async () => {
      const runtime = resolveCallRuntime(normalizedSpec, options);
      const normalizedInput = normalizeInput(input, inputSchema);
      let prompt = renderPrompt(normalizedSpec, normalizedInput);
      let lastResponse = "";
      const copilot = await createCopilotSession(runtime.model);
      let failure: unknown;

      try {
        for (let turn = 1; turn <= runtime.maxTurns; turn += 1) {
          throwIfAborted(runtime.signal);
          const context: AgentMiddlewareContext = {
            spec: normalizedSpec,
            session: copilot.session,
            input: normalizedInput,
            outputSchema,
            turn,
            maxTurns: runtime.maxTurns,
            prompt,
            completed: false,
          };

          await runAgentMiddlewares(runtime.middlewares, context, async () => {
            lastResponse = await sendCopilotPrompt(copilot.session, context.prompt, runtime.signal);
            context.response = lastResponse;
            const analysis = analyzeResponse(lastResponse, outputSchema, normalizedSpec.name, turn);
            if (analysis.ok) {
              context.completed = true;
              context.output = analysis.output;
              return;
            }
            if (turn === runtime.maxTurns || runtime.repair === false) {
              context.error = analysis.error;
              return;
            }
            context.nextPrompt = repairPrompt(normalizedSpec, analysis.error);
          });

          if (context.error !== undefined) {
            throw context.error;
          }
          if (context.completed) {
            return context.output;
          }
          if (context.nextPrompt === undefined) {
            throw new Error(
              `Agent ${normalizedSpec.name}: middleware must set context.output with context.completed=true or context.nextPrompt for turn ${turn}.`,
            );
          }
          prompt = context.nextPrompt;
        }
      } catch (error) {
        failure = error;
        throw error;
      } finally {
        try {
          await copilot.close();
        } catch (cleanupError) {
          if (failure === undefined) {
            throw cleanupError;
          }
        }
      }

      throw new Error(`Agent ${normalizedSpec.name} failed after ${runtime.maxTurns} turns. Last response:\n${lastResponse}`);
    })) as AgentFn<any, any>;

  fn.agentName = normalizedSpec.name;
  fn.inputSchema = inputSchema;
  fn.outputSchema = outputSchema;
  fn.inputShape = inputSchema;
  fn.outputShape = outputSchema;
  fn.spec = normalizedSpec;
  fn._namespace = normalizedSpec.name;
  return fn;
}

export type AgentFactory = typeof agent;

function validate(value: unknown, schema: Schema): ValidationResult {
  return validateSchema(value, schema, "$", false);
}

function normalizeSpec(specOrName: AgentSpec<any, any>): AgentSpec<any, any> {
  const spec: AgentSpec<any, any> = {
    name: specOrName.name,
  };
  if (specOrName.instructions !== undefined) spec.instructions = specOrName.instructions;
  if (specOrName.input !== undefined) {
    assertValidSchema(specOrName.input, specOrName.name, "input");
    spec.input = specOrName.input;
  }
  if (specOrName.output !== undefined) {
    assertValidSchema(specOrName.output, specOrName.name, "output");
    spec.output = specOrName.output;
  }
  if (specOrName.model !== undefined) spec.model = specOrName.model;
  if (specOrName.timeout !== undefined) spec.timeout = specOrName.timeout;
  if (specOrName.maxTurns !== undefined) spec.maxTurns = specOrName.maxTurns;
  if (specOrName.repair !== undefined) spec.repair = specOrName.repair;
  if (specOrName.middleware !== undefined) spec.middleware = specOrName.middleware;
  if (specOrName.agents !== undefined) spec.agents = specOrName.agents;
  return spec;
}

function normalizeInput(input: unknown, schema: Schema): unknown {
  if (input !== undefined) {
    return input;
  }
  if (schema.kind === "string") {
    return "";
  }
  if (schema.kind === "object") {
    return {};
  }
  return input ?? null;
}

function renderPrompt(spec: AgentSpec<any, any>, input: unknown): string {
  const value = inlineShellPrompts(input);
  const sections = [
    tag("instructions", (spec.instructions ?? "Return only valid JSON matching the output schema.").trim()),
    tag("output_schema", renderSchema(spec.output ?? defaultStringSchema)),
    tag("input", json(value)),
  ];

  if (spec.agents && Object.keys(spec.agents).length > 0) {
    sections.push(tag(
      "subagents",
      json(Object.entries(spec.agents).map(([name, subagent]) => ({
        name,
        instructions: subagent.spec.instructions ?? null,
        model: subagent.spec.model ?? null,
        input: renderSchema(subagent.inputSchema),
        output: renderSchema(subagent.outputSchema),
      }))),
    ));
  }

  sections.push(tag("rules", [
    "Return exactly one JSON value.",
    "Do not wrap the JSON in Markdown.",
    "Match the output schema exactly.",
  ].join("\n")));

  return sections.join("\n\n");
}

function repairPrompt(spec: AgentSpec<any, any>, error: AgentError): string {
  if (typeof spec.repair === "function") {
    return spec.repair(error);
  }
  return [
    `<repair agent="${escapeAttribute(spec.name)}" turn="${error.turn}">`,
    tag("instructions", "Your previous response was invalid. Return only corrected JSON."),
    tag("error", error.message),
    tag("output_schema", error.schemaText),
    tag("previous_response", error.response),
    "</repair>",
  ].join("\n\n");
}

function parseJson(text: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {}

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try {
      return { ok: true, value: JSON.parse(fenced[1]) };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (!objectMatch) {
    return { ok: false, error: "No JSON value found." };
  }

  try {
    return { ok: true, value: JSON.parse(objectMatch[0]) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function validateSchema(value: unknown, schema: Schema, path: string, optional: boolean): ValidationResult {
  if (optional && value === undefined) {
    return { ok: true };
  }

  switch (schema.kind) {
    case "string":
      return typeof value === "string" ? ok() : bad(path, "string", value);
    case "number":
      return typeof value === "number" ? ok() : bad(path, "number", value);
    case "boolean":
      return typeof value === "boolean" ? ok() : bad(path, "boolean", value);
    case "unknown":
      return ok();
    case "enum":
      return schema.values.some((item: Json) => deepEqual(item, value))
        ? ok()
        : bad(path, schema.values.map((item: Json) => JSON.stringify(item)).join(" | "), value);
    case "optional":
      return validateSchema(value, schema.inner, path, true);
    case "array": {
      if (!Array.isArray(value)) {
        return bad(path, "array", value);
      }
      for (let index = 0; index < value.length; index += 1) {
        const result = validateSchema(value[index], schema.item, `${path}[${index}]`, false);
        if (!result.ok) {
          return result;
        }
      }
      return ok();
    }
    case "record": {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        return bad(path, "object", value);
      }
      for (const [key, item] of Object.entries(value)) {
        const result = validateSchema(item, schema.value, `${path}.${key}`, false);
        if (!result.ok) {
          return result;
        }
      }
      return ok();
    }
    case "object": {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        return bad(path, "object", value);
      }
      for (const [key, fieldSchema] of Object.entries(schema.fields) as [string, Schema][]) {
        const result = validateSchema(
          (value as Record<string, unknown>)[key],
          fieldSchema,
          `${path}.${key}`,
          false,
        );
        if (!result.ok) {
          return result;
        }
      }
      return ok();
    }
  }
}

function renderSchema(schema: Schema): string {
  return renderSchemaNode(schema, 0);
}

function renderSchemaNode(schema: Schema, indent: number): string {
  const pad = "  ".repeat(indent);
  const describe = (text: string): string => (
    schema.description ? `${text} /* ${schema.description.replaceAll("*/", "* /").replaceAll("\n", " ").trim()} */` : text
  );
  switch (schema.kind) {
    case "string":
      return describe("string");
    case "number":
      return describe("number");
    case "boolean":
      return describe("boolean");
    case "unknown":
      return describe("unknown");
    case "enum":
      return describe(schema.values.map((value: Json) => JSON.stringify(value)).join(" | "));
    case "optional":
      return describe(`${renderSchemaNode(schema.inner, indent)} | undefined`);
    case "array":
      return describe(`${renderSchemaNode(schema.item, indent)}[]`);
    case "record":
      return describe(`{\n${pad}  [key: string]: ${renderSchemaNode(schema.value, indent + 1)};\n${pad}}`);
    case "object": {
      const lines = ["{"];
      for (const [key, value] of Object.entries(schema.fields) as [string, Schema][]) {
        if (value.kind === "optional") {
          lines.push(`${pad}  ${key}?: ${renderSchemaNode(value.inner, indent + 1)};`);
        } else {
          lines.push(`${pad}  ${key}: ${renderSchemaNode(value, indent + 1)};`);
        }
      }
      lines.push(`${pad}}`);
      return describe(lines.join("\n"));
    }
  }
}

function inlineShellPrompts<T>(value: T): T {
  const seen = new WeakSet<object>();

  const walk = (current: unknown): unknown => {
    if (isIntent(current)) {
      return renderIntent(current);
    }
    if (!current || typeof current !== "object") {
      return current;
    }
    if (seen.has(current)) {
      throw new Error("Cannot serialize circular input while preparing prompt.");
    }
    seen.add(current);
    if (Array.isArray(current)) {
      return current.map(walk);
    }
    return Object.fromEntries(Object.entries(current).map(([key, item]) => [key, walk(item)]));
  };

  return walk(value) as T;
}

type ResponseAnalysisResult = { ok: true; output: unknown } | { ok: false; error: AgentError };

function analyzeResponse(response: string, outputSchema: Schema, agentName: string, turn: number): ResponseAnalysisResult {
  const parsed = parseJson(response);
  if (!parsed.ok) {
    return {
      ok: false,
      error: new AgentError({
        kind: "parse",
        agent: agentName,
        turn,
        response,
        schema: outputSchema,
        message: `Agent ${agentName} returned invalid JSON: ${parsed.error}`,
      }),
    };
  }

  const result = validate(parsed.value, outputSchema);
  if (!result.ok) {
    return {
      ok: false,
      error: new AgentError({
        kind: "validation",
        agent: agentName,
        turn,
        response,
        schema: outputSchema,
        message: `Agent ${agentName} output validation failed: ${result.error}`,
      }),
    };
  }

  return { ok: true, output: parsed.value };
}

function renderShellPrompt(intent: Intent): string {
  const options = formatShellOptions(intent.options);
  switch (intent.mode) {
    case "sh.text":
      return `Run bash command and return stdout as text: ${intent.command}${shellExecutionContext()}${options}`;
    case "sh.result":
      return `Run bash command and return a structured result (stdout, stderr, exitCode): ${intent.command}${shellExecutionContext()}${options}`;
    case "sh.read":
      return `Read file and return its contents as text: ${JSON.stringify(requiredPath(intent))}${shellExecutionContext()}${options}`;
    case "sh.write":
      return `Write file at path ${JSON.stringify(requiredPath(intent))} with contents:\n${intent.contents ?? ""}${shellExecutionContext()}${options}`;
    default:
      throw new Error(`Unsupported shell mode: ${(intent as { mode?: string }).mode ?? "unknown"}`);
  }
}

function shellExecutionContext(): string {
  return "\nRig runs inside a sandboxed agentic workflow. Execute this action directly without asking for extra permission or confirmation.";
}

function formatShellOptions(options: Intent["options"]): string {
  return options ? `\nOptions: ${json(options)}` : "";
}

function requiredPath(intent: Intent): string {
  if (!intent.path) {
    throw new Error(`Shell mode ${intent.mode} requires a path.`);
  }
  return intent.path;
}

function createIntent(
  mode: Intent["mode"],
  args: Omit<Partial<Intent>, "__rig" | "id" | "mode">,
): Intent {
  return { __rig: "sh", id: `intent_${nextIntentId++}`, mode, ...args };
}

function stripSignal(options: IntentOptions): Omit<IntentOptions, "signal"> {
  const { signal: _signal, ...rest } = options;
  return rest;
}

function withOptions<T extends Omit<Partial<Intent>, "__rig" | "id" | "mode">>(
  value: T,
  options?: IntentOptions,
): T | (T & { options: Omit<IntentOptions, "signal"> }) {
  return options ? { ...value, options: stripSignal(options) } : value;
}

function configureCopilot(options: CopilotEngineOptions): void {
  currentCopilotOptions = options;
}

function getCopilotClient(): CopilotClient {
  return currentCopilotClient.getStore() ?? copilotEngine(currentCopilotOptions);
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function throwCleanupErrors(errors: Error[], message: string): void {
  if (errors.length === 1) {
    throw errors[0]!;
  }
  if (errors.length > 1) {
    throw new AggregateError(errors, message);
  }
}

async function stopCopilotClient(client: CopilotClient): Promise<void> {
  const errors: Error[] = [];

  try {
    const stopErrors = await client.stop();
    if (Array.isArray(stopErrors)) {
      errors.push(...stopErrors.map(asError));
    }
  } catch (error) {
    errors.push(asError(error));
  }

  throwCleanupErrors(errors, "Failed to stop Copilot client");
}

async function withCopilotClient<T>(fn: () => Promise<T>): Promise<T> {
  if (currentCopilotClient.getStore()) {
    return fn();
  }

  const client = getCopilotClient();
  let failure: unknown;

  return await currentCopilotClient.run(client, async () => {
    try {
      return await fn();
    } catch (error) {
      failure = error;
      throw error;
    } finally {
      try {
        await stopCopilotClient(client);
      } catch (cleanupError) {
        if (failure === undefined) {
          throw cleanupError;
        }
      }
    }
  });
}

async function createCopilotSession(model: string): Promise<CopilotSessionHandle> {
  const client = getCopilotClient();
  const session: CopilotSession = await client.createSession({ model, streaming: false });
  session.on?.((event: unknown) => {
    writeEvent(event);
  });

  return {
    session,
    async close() {
      if (!session.disconnect) {
        return;
      }
      try {
        await session.disconnect();
      } catch (error) {
        throw asError(error);
      }
    },
  };
}

async function sendCopilotPrompt(session: CopilotSession, prompt: string, signal?: AbortSignal): Promise<string> {
  const request = signal ? { prompt, signal } : { prompt };
  writeEvent(rigEvent("copilot-ask", { prompt }));
  const response = await session.sendAndWait(request);
  if (!response) {
    return "";
  }
  if (typeof response === "string") {
    return response;
  }
  const value = response as any;
  return value?.data?.content ?? value?.data?.text ?? value?.text ?? value?.content ?? JSON.stringify(response);
}

function resolveCallRuntime(spec: AgentSpec<any, any>, options: CallOptions): {
  model: string;
  maxTurns: number;
  signal: AbortSignal | undefined;
  repair: RepairHandler;
  middlewares: AgentMiddleware[];
} {
  return {
    model: options.model ?? spec.model ?? "gpt-4.1",
    maxTurns: options.maxTurns ?? spec.maxTurns ?? 4,
    signal: timeoutSignal(options.signal, options.timeout ?? spec.timeout),
    repair: spec.repair ?? "default",
    middlewares: [
      ...normalizeMiddlewares(spec.middleware),
      ...normalizeMiddlewares(options.middleware),
    ],
  };
}

function normalizeMiddlewares(middlewares?: AgentMiddleware | AgentMiddleware[]): AgentMiddleware[] {
  if (!middlewares) {
    return [];
  }
  const items = Array.isArray(middlewares) ? [...middlewares] : [middlewares];
  for (const middleware of items) {
    if (typeof middleware !== "function") {
      throw new Error("Agent middleware entries must be functions.");
    }
  }
  return items;
}

async function runAgentMiddlewares(
  middlewares: AgentMiddleware[],
  context: AgentMiddlewareContext,
  terminal: () => Promise<void>,
): Promise<void> {
  let index = -1;
  const dispatch = async (current: number): Promise<void> => {
    if (current <= index) {
      throw new Error(`Agent ${context.spec.name} middleware at index ${current} called next() multiple times.`);
    }
    index = current;
    const middleware = middlewares[current];
    if (middleware === undefined) {
      await terminal();
      return;
    }
    await middleware(context, () => dispatch(current + 1));
  };
  await dispatch(0);
}

function isSchema(value: unknown): value is Schema {
  // Primitive schema helpers (s.string/s.number/etc.) are callable function objects with a `kind` field.
  return !!value
    && (typeof value === "object" || typeof value === "function")
    && "kind" in value
    && ["string", "number", "boolean", "unknown", "array", "object", "record", "enum", "optional"].includes((value as { kind: string }).kind);
}

function assertValidSchema(schema: Schema, agentName: string, slot: "input" | "output", path: string = slot): void {
  if (!isSchema(schema)) {
    throw new Error(`Invalid ${slot} schema for agent "${agentName}" at ${path}. Use declarative s.* schema helpers.`);
  }
  switch (schema.kind) {
    case "array":
      assertValidSchema(schema.item, agentName, slot, `${path}[]`);
      return;
    case "record":
      assertValidSchema(schema.value, agentName, slot, `${path}.*`);
      return;
    case "optional":
      assertValidSchema(schema.inner, agentName, slot, path);
      return;
    case "object":
      for (const [key, value] of Object.entries(schema.fields) as [string, Schema][]) {
        assertValidSchema(value, agentName, slot, `${path}.${key}`);
      }
      return;
    default:
      return;
  }
}

function isIntent(value: unknown): value is Intent {
  return !!value
    && typeof value === "object"
    && (value as { __rig?: unknown }).__rig === "sh"
    && typeof (value as { mode?: unknown }).mode === "string";
}

function renderIntent(intent: Intent): string {
  return renderShellPrompt(intent);
}

function ok(): ValidationResult {
  return { ok: true };
}

function bad(path: string, expected: string, actual: unknown): ValidationResult {
  const actualType = actual === null ? "null" : Array.isArray(actual) ? "array" : typeof actual;
  return { ok: false, error: `${path}: expected ${expected}, got ${actualType}` };
}

function tag(name: string, value: string): string {
  return `<${name}>\n${value}\n</${name}>`;
}

function json(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function deepEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function escapeAttribute(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw signal.reason ?? new DOMException("Aborted", "AbortError");
  }
}

function timeoutSignal(parent?: AbortSignal, timeout?: number): AbortSignal | undefined {
  if (!timeout) {
    return parent;
  }
  const controller = new AbortController();
  const onAbort = () => controller.abort(parent?.reason);
  parent?.addEventListener("abort", onAbort, { once: true });
  const timer = setTimeout(() => controller.abort(new Error(`Timed out after ${timeout}ms`)), timeout);
  controller.signal.addEventListener("abort", () => clearTimeout(timer), { once: true });
  return controller.signal;
}

const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) {
  runLauncherCli().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
