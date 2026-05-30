import { basename, isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { CopilotClient, RuntimeConnection } from "@github/copilot-sdk";
import type { CopilotClientOptions } from "@github/copilot-sdk";

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type ValidationResult = { ok: true } | { ok: false; error: string };

export type StringSchema = { kind: "string" };
export type NumberSchema = { kind: "number" };
export type BooleanSchema = { kind: "boolean" };
export type UnknownSchema = { kind: "unknown" };
export type ArraySchema<Item extends Schema = Schema> = { kind: "array"; item: Item };
export type ObjectSchema<Fields extends Record<string, Schema> = Record<string, Schema>> = {
  kind: "object";
  fields: Fields;
};
export type RecordSchema<Value extends Schema = Schema> = { kind: "record"; value: Value };
export type EnumSchema<Values extends readonly Json[] = readonly Json[]> = { kind: "enum"; values: Values };
export type LiteralSchema<Value extends Json = Json> = { kind: "literal"; value: Value };
export type NullableSchema<Inner extends Schema = Schema> = { kind: "nullable"; inner: Inner };
export type OptionalSchema<Inner extends Schema = Schema> = { kind: "optional"; inner: Inner };

export type Schema =
  | StringSchema
  | NumberSchema
  | BooleanSchema
  | UnknownSchema
  | ArraySchema<any>
  | ObjectSchema<any>
  | RecordSchema<any>
  | EnumSchema<any>
  | LiteralSchema<any>
  | NullableSchema<any>
  | OptionalSchema<any>;

export type Simplify<T> = { [K in keyof T]: T[K] } & {};

export type AnyIntent = ShIntent;

export type AgentInputValue<T> =
  T extends readonly (infer Item)[] ? AnyIntent | AgentInputValue<Item>[] :
  T extends object ? AnyIntent | { [K in keyof T]: AgentInputValue<T[K]> } :
  T | AnyIntent;

export type InferSchema<T> =
  T extends { kind: "string" } ? string :
  T extends { kind: "number" } ? number :
  T extends { kind: "boolean" } ? boolean :
  T extends { kind: "unknown" } ? unknown :
  T extends { kind: "array"; item: infer Item } ? InferSchema<Item>[] :
  T extends { kind: "record"; value: infer Value } ? Record<string, InferSchema<Value>> :
  T extends { kind: "enum"; values: infer Values extends readonly unknown[] } ? Values[number] :
  T extends { kind: "literal"; value: infer Value } ? Value :
  T extends { kind: "nullable"; inner: infer Inner } ? InferSchema<Inner> | null :
  T extends { kind: "optional"; inner: infer Inner } ? InferSchema<Inner> | undefined :
  T extends { kind: "object"; fields: infer Fields extends Record<string, unknown> } ? Simplify<
    & { [K in keyof Fields as Fields[K] extends { kind: "optional" } ? never : K]: InferSchema<Fields[K]> }
    & { [K in keyof Fields as Fields[K] extends { kind: "optional" } ? K : never]?: Fields[K] extends { kind: "optional"; inner: infer Inner } ? InferSchema<Inner> : never }
  > :
  unknown;

export const s = {
  string: { kind: "string" } as StringSchema,
  number: { kind: "number" } as NumberSchema,
  boolean: { kind: "boolean" } as BooleanSchema,
  unknown: { kind: "unknown" } as UnknownSchema,
  array<Item extends Schema>(item: Item): ArraySchema<Item> {
    return { kind: "array", item };
  },
  object<Fields extends Record<string, Schema>>(fields: Fields): ObjectSchema<Fields> {
    return { kind: "object", fields };
  },
  record<Value extends Schema>(value: Value): RecordSchema<Value> {
    return { kind: "record", value };
  },
  enum<const Values extends readonly Json[]>(...values: Values): EnumSchema<Values> {
    return { kind: "enum", values };
  },
  literal<Value extends Json>(value: Value): LiteralSchema<Value> {
    return { kind: "literal", value };
  },
  nullable<Inner extends Schema>(inner: Inner): NullableSchema<Inner> {
    return { kind: "nullable", inner };
  },
  optional<Inner extends Schema>(inner: Inner): OptionalSchema<Inner> {
    return { kind: "optional", inner };
  },
};

const defaultTextSchema = s.object({ text: s.string });

export type CopilotEngineOptions = Omit<CopilotClientOptions, "connection"> & {
  connection?: CopilotClientOptions["connection"];
  server?: boolean;
};

export function copilotEngine(options: CopilotEngineOptions = {}): CopilotClient {
  const { server, connection, ...clientOptions } = options;
  return new CopilotClient({
    ...clientOptions,
    connection: connection ?? (server ? RuntimeConnection.forStdio() : RuntimeConnection.forUri(process.env["AGENT_HTTP_URL"] ?? "localhost:7777")),
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
    return JSON.stringify({ source: "copilot-sdk", type: "logger.error", error: reason });
  }
}

export type RepairHandler = false | "default" | ((error: AgentError) => string);

export type AgentSpec<Input extends Schema = ObjectSchema<{ text: StringSchema }>, Output extends Schema = ObjectSchema<{ text: StringSchema }>> = {
  name: string;
  instructions?: string;
  input?: Input;
  output?: Output;
  model?: string;
  timeout?: number;
  maxTurns?: number;
  repair?: RepairHandler;
  permissions?: { shell?: "deny" | "readonly" | "ask" | "allow"; write?: "deny" | "workspace" | "allow" };
  agents?: Record<string, AgentFn<any, any>>;
};

export type CallOptions = {
  signal?: AbortSignal;
  timeout?: number;
  model?: string;
  maxTurns?: number;
};

export type LaunchOptions = {
  cwd?: string;
  startServer?: boolean;
};

export type LauncherIo = {
  stdin: NodeJS.ReadableStream;
  stdout: NodeJS.WritableStream;
};

/**
 * Lifecycle events emitted by an agent during a call.
 * Subscribe via `myAgent.subscribe(listener)`.
 *
 * Analogous to pi-agent's `AgentEvent`.
 */
export type RigEvent =
  | { type: "call"; agent: string; input: unknown; options: CallOptions }
  | { type: "send"; agent: string; turn: number; prompt: string }
  | { type: "response"; agent: string; turn: number; response: string }
  | { type: "result"; agent: string; output: unknown }
  | { type: "error"; agent: string; error: unknown };

export type RigListener = (event: RigEvent) => void | Promise<void>;

export type AgentFn<Input = unknown, Output = unknown> = ((input: AgentInputValue<Input>, options?: CallOptions) => Promise<Output>) & {
  agentName: string;
  inputSchema: Schema;
  outputSchema: Schema;
  inputShape: Schema;
  outputShape: Schema;
  spec: AgentSpec<any, any>;
  _namespace: string;
  /**
   * Subscribe to agent lifecycle events without wrapping the agent.
   * Returns an unsubscribe function.
   *
   * Analogous to pi-agent's `Agent.subscribe()`.
   *
   * @example
   * ```typescript
   * const unsubscribe = myAgent.subscribe((event) => {
   *   if (event.type === "result") console.log("output:", event.output);
   * });
   * ```
   */
  subscribe(listener: RigListener): () => void;
};

export type ShOptions = {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  purpose?: string;
  signal?: AbortSignal;
};

export type ShIntent = {
  __rig: "sh";
  id: string;
  mode: "sh.text" | "sh.result" | "sh.read" | "sh.write";
  command?: string;
  path?: string;
  contents?: string;
  options?: Omit<ShOptions, "signal">;
};

let nextIntentId = 1;

type PromptHelpers = {
  (strings: TemplateStringsArray, ...values: unknown[]): string;
  bash(command: string, options?: ShOptions): ShIntent;
  result(command: string, options?: ShOptions): ShIntent;
  read(path: string, options?: ShOptions): ShIntent;
  write(path: string, contents: string, options?: ShOptions): ShIntent;
};

function renderPromptTemplate(strings: TemplateStringsArray, ...values: unknown[]): string {
  let result = strings[0] ?? "";
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    result += isAnyIntent(value) ? renderAnyIntent(value) : String(value);
    result += strings[index + 1] ?? "";
  }
  return result;
}

export const p: PromptHelpers = Object.assign(renderPromptTemplate, {
  bash(command: string, options?: ShOptions): ShIntent {
    return createIntent("sh.text", withOptions({ command }, options));
  },
  result(command: string, options?: ShOptions): ShIntent {
    return createIntent("sh.result", withOptions({ command }, options));
  },
  read(path: string, options?: ShOptions): ShIntent {
    return createIntent("sh.read", withOptions({ path }, options));
  },
  write(path: string, contents: string, options?: ShOptions): ShIntent {
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
let currentCopilotClient: CopilotClient | undefined;
type CopilotSession = {
  on?: (handler: (event: unknown) => void) => unknown;
  sendAndWait(request: { prompt: string; signal?: AbortSignal }): Promise<unknown>;
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
    throw new Error(`Usage: ${scriptName} <program-file>`);
  }

  const cwd = options.cwd ?? process.cwd();
  const resolvedPath = isAbsolute(programPath) ? programPath : resolve(cwd, programPath);

  configureCopilot(resolveCopilotOptions(cwd, options));
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
  const flags = argv.slice(1);
  const serverFlag = flags.includes("--server");
  const unknownFlags = flags.filter((f) => f !== "--server");
  const scriptName = process.argv[1] ? basename(process.argv[1]) : "launcher";
  if (!programPath || unknownFlags.length > 0) {
    throw new Error(`Usage: ${scriptName} <program-file> [--server]`);
  }
  const mergedOptions: LaunchOptions = serverFlag ? { ...options, startServer: true } : options;
  await runRootAgentFromStdin(programPath, mergedOptions, io, scriptName);
}

export function agent<
  const Input extends Schema = ObjectSchema<{ text: StringSchema }>,
  const Output extends Schema = ObjectSchema<{ text: StringSchema }>
>(spec: AgentSpec<Input, Output>): AgentFn<InferSchema<Input>, InferSchema<Output>>;
export function agent(spec: AgentSpec<any, any>): AgentFn<any, any> {
  const normalizedSpec = normalizeSpec(spec);
  const inputSchema = normalizedSpec.input ?? defaultTextSchema;
  const outputSchema = normalizedSpec.output ?? defaultTextSchema;

  const listeners = new Set<RigListener>();

  const fn = (async (input: unknown, options: CallOptions = {}) => {
    const runtime = resolveCallRuntime(normalizedSpec, options);
    const session = createCopilotSession(runtime.model);
    const normalizedInput = normalizeInput(input, inputSchema);
    let prompt = renderPrompt(normalizedSpec, normalizedInput);
    let lastResponse = "";

    await emitEvent(listeners, { type: "call", agent: normalizedSpec.name, input, options });

    try {
      for (let turn = 1; turn <= runtime.maxTurns; turn += 1) {
        throwIfAborted(runtime.signal);
        await emitEvent(listeners, { type: "send", agent: normalizedSpec.name, turn, prompt });
        lastResponse = await sendCopilotPrompt(session, prompt, runtime.signal);
        await emitEvent(listeners, { type: "response", agent: normalizedSpec.name, turn, response: lastResponse });

        const analysis = analyzeResponse(lastResponse, outputSchema, normalizedSpec.name, turn);
        if (analysis.ok) {
          await emitEvent(listeners, { type: "result", agent: normalizedSpec.name, output: analysis.output });
          return analysis.output;
        }

        if (turn === runtime.maxTurns || runtime.repair === false) {
          throw analysis.error;
        }

        prompt = repairPrompt(normalizedSpec, analysis.error);
      }

      throw new Error(`Agent ${normalizedSpec.name} failed after ${runtime.maxTurns} turns. Last response:\n${lastResponse}`);
    } catch (error) {
      await emitEvent(listeners, { type: "error", agent: normalizedSpec.name, error });
      throw error;
    }
  }) as AgentFn<any, any>;

  fn.agentName = normalizedSpec.name;
  fn.inputSchema = inputSchema;
  fn.outputSchema = outputSchema;
  fn.inputShape = inputSchema;
  fn.outputShape = outputSchema;
  fn.spec = normalizedSpec;
  fn._namespace = normalizedSpec.name;
  fn.subscribe = (listener: RigListener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
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
  if (specOrName.permissions !== undefined) spec.permissions = specOrName.permissions;
  if (specOrName.agents !== undefined) spec.agents = specOrName.agents;
  return spec;
}

function normalizeInput(input: unknown, schema: Schema): unknown {
  if (input !== undefined) {
    return input;
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
    tag("output_schema", renderSchema(spec.output ?? defaultTextSchema)),
    tag("input", json(value)),
  ];

  if (spec.permissions) {
    sections.push(tag("permissions", json(spec.permissions)));
  }

  if (spec.agents && Object.keys(spec.agents).length > 0) {
    sections.push(tag(
      "subagents",
      json(Object.entries(spec.agents).map(([name, subagent]) => ({
        name,
        input: renderSchema(subagent.inputSchema),
        output: renderSchema(subagent.outputSchema),
      }))),
    ));
  }

  sections.push(tag("rules", [
    "Return exactly one JSON object.",
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
    return { ok: false, error: "No JSON object found." };
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
    case "literal":
      return deepEqual(value, schema.value) ? ok() : bad(path, JSON.stringify(schema.value), value);
    case "enum":
      return schema.values.some((item: Json) => deepEqual(item, value))
        ? ok()
        : bad(path, schema.values.map((item: Json) => JSON.stringify(item)).join(" | "), value);
    case "nullable":
      return value === null ? ok() : validateSchema(value, schema.inner, path, false);
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
  switch (schema.kind) {
    case "string":
      return "string";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "unknown":
      return "unknown";
    case "literal":
      return JSON.stringify(schema.value);
    case "enum":
      return schema.values.map((value: Json) => JSON.stringify(value)).join(" | ");
    case "nullable":
      return `${renderSchemaNode(schema.inner, indent)} | null`;
    case "optional":
      return `${renderSchemaNode(schema.inner, indent)} | undefined`;
    case "array":
      return `${renderSchemaNode(schema.item, indent)}[]`;
    case "record":
      return `{\n${pad}  [key: string]: ${renderSchemaNode(schema.value, indent + 1)};\n${pad}}`;
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
      return lines.join("\n");
    }
  }
}

function inlineShellPrompts<T>(value: T): T {
  const seen = new WeakSet<object>();

  const walk = (current: unknown): unknown => {
    if (isAnyIntent(current)) {
      return renderAnyIntent(current);
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

function renderShellPrompt(intent: ShIntent): string {
  const options = formatShellOptions(intent.options);
  switch (intent.mode) {
    case "sh.text":
      return `Run bash command and return stdout as text: ${intent.command}${options}`;
    case "sh.result":
      return `Run bash command and return a structured result (stdout, stderr, exitCode): ${intent.command}${options}`;
    case "sh.read":
      return `Read file and return its contents as text: ${JSON.stringify(requiredPath(intent))}${options}`;
    case "sh.write":
      return `Write file at path ${JSON.stringify(requiredPath(intent))} with contents:\n${intent.contents ?? ""}${options}`;
    default:
      throw new Error(`Unsupported shell mode: ${(intent as { mode?: string }).mode ?? "unknown"}`);
  }
}

function formatShellOptions(options: ShIntent["options"]): string {
  return options ? `\nOptions: ${json(options)}` : "";
}

function requiredPath(intent: ShIntent): string {
  if (!intent.path) {
    throw new Error(`Shell mode ${intent.mode} requires a path.`);
  }
  return intent.path;
}

function createIntent(
  mode: ShIntent["mode"],
  args: Omit<Partial<ShIntent>, "__rig" | "id" | "mode">,
): ShIntent {
  return { __rig: "sh", id: `intent_${nextIntentId++}`, mode, ...args };
}

function stripSignal(options: ShOptions): Omit<ShOptions, "signal"> {
  const { signal: _signal, ...rest } = options;
  return rest;
}

function withOptions<T extends Omit<Partial<ShIntent>, "__rig" | "id" | "mode">>(
  value: T,
  options?: ShOptions,
): T | (T & { options: Omit<ShOptions, "signal"> }) {
  return options ? { ...value, options: stripSignal(options) } : value;
}

function configureCopilot(options: CopilotEngineOptions): void {
  currentCopilotOptions = options;
  currentCopilotClient = undefined;
}

function getCopilotClient(): CopilotClient {
  currentCopilotClient ??= copilotEngine(currentCopilotOptions);
  return currentCopilotClient;
}

async function createCopilotSession(model: string): Promise<CopilotSession> {
  const session = await getCopilotClient().createSession({ model, streaming: false }) as CopilotSession;
  session.on?.((event: unknown) => {
    process.stderr.write(`${jsonl({ source: "copilot-sdk", event })}\n`);
  });
  return session;
}

async function sendCopilotPrompt(sessionPromise: Promise<CopilotSession>, prompt: string, signal?: AbortSignal): Promise<string> {
  const session = await sessionPromise;
  const request = signal ? { prompt, signal } : { prompt };
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
} {
  return {
    model: options.model ?? spec.model ?? "gpt-4.1",
    maxTurns: options.maxTurns ?? spec.maxTurns ?? 4,
    signal: timeoutSignal(options.signal, options.timeout ?? spec.timeout),
    repair: spec.repair ?? "default",
  };
}

function isSchema(value: unknown): value is Schema {
  return !!value
    && typeof value === "object"
    && "kind" in value
    && ["string", "number", "boolean", "unknown", "array", "object", "record", "enum", "literal", "nullable", "optional"].includes((value as { kind: string }).kind);
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
    case "nullable":
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

function isAnyIntent(value: unknown): value is AnyIntent {
  return !!value
    && typeof value === "object"
    && (value as { __rig?: unknown }).__rig === "sh"
    && typeof (value as { mode?: unknown }).mode === "string";
}

function renderAnyIntent(intent: AnyIntent): string {
  return renderShellPrompt(intent);
}

async function emitEvent(listeners: Set<RigListener>, event: RigEvent): Promise<void> {
  for (const listener of listeners) {
    await listener(event);
  }
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
