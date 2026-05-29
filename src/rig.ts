import { copilotEngine } from "./engines/copilot.js";

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type ValidationResult = { ok: true } | { ok: false; error: string };

export type StringSchema = { kind: "string" };
export type NumberSchema = { kind: "number" };
export type BooleanSchema = { kind: "boolean" };
export type UnknownSchema = { kind: "unknown" };
export type ArraySchema<Item extends SchemaLike = SchemaLike> = { kind: "array"; item: Item };
export type ObjectSchema<Fields extends Record<string, SchemaLike> = Record<string, SchemaLike>> = {
  kind: "object";
  fields: Fields;
};
export type RecordSchema<Value extends SchemaLike = SchemaLike> = { kind: "record"; value: Value };
export type EnumSchema<Values extends readonly Json[] = readonly Json[]> = { kind: "enum"; values: Values };
export type LiteralSchema<Value extends Json = Json> = { kind: "literal"; value: Value };
export type NullableSchema<Inner extends SchemaLike = SchemaLike> = { kind: "nullable"; inner: Inner };
export type OptionalSchema<Inner extends SchemaLike = SchemaLike> = { kind: "optional"; inner: Inner };

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

export type SchemaLike = Schema | string | number | boolean | readonly [SchemaLike] | { [key: string]: SchemaLike };

export type Simplify<T> = { [K in keyof T]: T[K] } & {};
export type AgentInputValue<T> =
  T extends readonly (infer Item)[] ? ShIntent | Intent | AgentInputValue<Item>[] :
  T extends object ? ShIntent | Intent | { [K in keyof T]: AgentInputValue<T[K]> } :
  T | ShIntent | Intent;

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
  T extends string ? string :
  T extends number ? number :
  T extends boolean ? boolean :
  T extends readonly [infer Item] ? InferSchema<Item>[] :
  T extends { "*": infer Value } ? Record<string, InferSchema<Value>> :
  T extends Record<string, unknown> ? Simplify<
    & { [K in keyof T as K extends `${infer _Name}_` ? never : K]: InferSchema<T[K]> }
    & { [K in keyof T as K extends `${infer Name}_` ? Name : never]?: InferSchema<T[K]> }
  > :
  unknown;

export const s = {
  string: { kind: "string" } as StringSchema,
  number: { kind: "number" } as NumberSchema,
  boolean: { kind: "boolean" } as BooleanSchema,
  unknown: { kind: "unknown" } as UnknownSchema,
  array<Item extends SchemaLike>(item: Item): ArraySchema<Item> {
    return { kind: "array", item };
  },
  object<Fields extends Record<string, SchemaLike>>(fields: Fields): ObjectSchema<Fields> {
    return { kind: "object", fields };
  },
  record<Value extends SchemaLike>(value: Value): RecordSchema<Value> {
    return { kind: "record", value };
  },
  enum<const Values extends readonly Json[]>(...values: Values): EnumSchema<Values> {
    return { kind: "enum", values };
  },
  literal<Value extends Json>(value: Value): LiteralSchema<Value> {
    return { kind: "literal", value };
  },
  nullable<Inner extends SchemaLike>(inner: Inner): NullableSchema<Inner> {
    return { kind: "nullable", inner };
  },
  optional<Inner extends SchemaLike>(inner: Inner): OptionalSchema<Inner> {
    return { kind: "optional", inner };
  },
};

export type Engine = {
  createSession(options: { model: string }): EngineSession;
};

export type EngineSession = {
  send(prompt: string, options: { signal?: AbortSignal }): Promise<string>;
};

export type RepairHandler = false | "default" | ((error: AgentError) => string);

export type Intent<Kind extends string = string, Payload = unknown> = {
  __rig: "intent";
  kind: Kind;
  id: string;
  payload: Payload;
};

export type Input<T = unknown> = {
  __rig: "input";
  schema: Schema;
  render?: (value: T) => string;
  __inferType?: T;
};

export type Output<T = unknown> = {
  __rig: "output";
  schema: Schema;
  parse?: (response: string) => unknown;
  repair?: RepairHandler;
  __inferType?: T;
};

export type InputSpec = SchemaLike | Input<any>;
export type OutputSpec = SchemaLike | Output<any>;

export type InferInputSpec<T> =
  T extends Input<infer V> ? V :
  T extends SchemaLike ? InferSchema<T> :
  unknown;

export type InferOutputSpec<T> =
  T extends Output<infer V> ? V :
  T extends SchemaLike ? InferSchema<T> :
  unknown;

export type ExtensionEvent =
  | { type: "call";   agent: string; turn: number; prompt: string }
  | { type: "result"; agent: string; turn: number; value: unknown }
  | { type: "error";  agent: string; turn: number; error: unknown };

export type Extension<
  Name extends string = string,
  Sh extends Record<string, (...args: any[]) => Intent> = Record<string, (...args: any[]) => Intent>,
  Inputs extends Record<string, Input<any>> = Record<string, Input<any>>,
  Outputs extends Record<string, Output<any>> = Record<string, Output<any>>,
> = {
  name: Name;
  sh?: Sh;
  inputs?: Inputs;
  outputs?: Outputs;
  agents?: Record<string, AgentFn<any, any>>;
  on?: (event: ExtensionEvent) => void | Promise<void>;
  wrapEngine?: (next: Engine) => Engine;
};

export type AgentSpec<Input extends InputSpec = ObjectSchema<{ text: StringSchema }>, Output extends OutputSpec = ObjectSchema<{ text: StringSchema }>> = {
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
  extensions?: Extension[];
};

export type CallOptions = {
  signal?: AbortSignal;
  timeout?: number;
  model?: string;
  maxTurns?: number;
  repair?: RepairHandler;
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

export function intent<K extends string, P>(kind: K, payload: P): Intent<K, P> {
  return { __rig: "intent", kind, id: `intent_${nextIntentId++}`, payload };
}

export function input<S extends SchemaLike>(spec: { schema: S; render?: (value: InferSchema<S>) => string }): Input<InferSchema<S>> {
  const wrapper: Input<InferSchema<S>> = { __rig: "input", schema: normalizeSchema(spec.schema) };
  if (spec.render) wrapper.render = spec.render;
  return wrapper;
}

export function output<S extends SchemaLike>(spec: { schema: S; parse?: (response: string) => unknown; repair?: RepairHandler }): Output<InferSchema<S>> {
  const wrapper: Output<InferSchema<S>> = { __rig: "output", schema: normalizeSchema(spec.schema) };
  if (spec.parse) wrapper.parse = spec.parse;
  if (spec.repair !== undefined) wrapper.repair = spec.repair;
  return wrapper;
}

export function defineExtension<
  const Name extends string,
  const Sh extends Record<string, (...args: any[]) => Intent>,
  const Inputs extends Record<string, Input<any>>,
  const Outputs extends Record<string, Output<any>>,
>(ext: Extension<Name, Sh, Inputs, Outputs>): Extension<Name, Sh, Inputs, Outputs> {
  return ext;
}

const globalExtensions: Extension[] = [];

export function useExtension(ext: Extension): void {
  if (!globalExtensions.includes(ext)) globalExtensions.push(ext);
}

export function listExtensions(): readonly Extension[] {
  return globalExtensions;
}

export function __resetExtensions(): void {
  globalExtensions.length = 0;
}

function collectExtensions(spec: AgentSpec<any, any>): Extension[] {
  const seen = new Set<Extension>();
  const out: Extension[] = [];
  for (const e of globalExtensions) if (!seen.has(e)) { seen.add(e); out.push(e); }
  for (const e of spec.extensions ?? []) if (!seen.has(e)) { seen.add(e); out.push(e); }
  return out;
}

function isIntent(value: unknown): value is Intent {
  return !!value && typeof value === "object" && (value as { __rig?: string }).__rig === "intent";
}

function isInput(value: unknown): value is Input {
  return !!value && typeof value === "object" && (value as { __rig?: string }).__rig === "input";
}

function isOutput(value: unknown): value is Output {
  return !!value && typeof value === "object" && (value as { __rig?: string }).__rig === "output";
}

function unwrapInput(value: InputSpec | undefined): { schema: Schema; render?: (value: unknown) => string } {
  if (isInput(value)) {
    const out: { schema: Schema; render?: (value: unknown) => string } = { schema: normalizeSchema(value.schema) };
    if (value.render) out.render = value.render as (value: unknown) => string;
    return out;
  }
  return { schema: normalizeSchema((value as SchemaLike | undefined) ?? s.object({ text: s.string })) };
}

function unwrapOutput(value: OutputSpec | undefined): { schema: Schema; parse?: (response: string) => unknown; repair?: RepairHandler } {
  if (isOutput(value)) {
    const out: { schema: Schema; parse?: (response: string) => unknown; repair?: RepairHandler } = { schema: normalizeSchema(value.schema) };
    if (value.parse) out.parse = value.parse;
    if (value.repair !== undefined) out.repair = value.repair;
    return out;
  }
  return { schema: normalizeSchema((value as SchemaLike | undefined) ?? s.object({ text: s.string })) };
}

export const sh = {
  shell(command: string, options?: ShOptions): ShIntent {
    return createIntent("sh.text", withOptions({ command }, options));
  },
  text(command: string, options?: ShOptions): ShIntent {
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
};

export function p(strings: TemplateStringsArray, ...values: unknown[]): string {
  let result = strings[0] ?? "";
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    result += isShIntent(value) ? renderShellPrompt(value) : isIntent(value) ? renderGenericIntent(value) : String(value);
    result += strings[index + 1] ?? "";
  }
  return result;
}

export function collectIntents<T>(value: T): { value: T; intents: (ShIntent | Intent)[] } {
  const intents: (ShIntent | Intent)[] = [];
  const seen = new WeakSet<object>();

  const walk = (current: unknown): unknown => {
    if (isShIntent(current)) {
      intents.push(current);
      return { $intent: current.id };
    }
    if (isIntent(current)) {
      intents.push(current);
      return { $intent: current.id };
    }
    if (!current || typeof current !== "object") {
      return current;
    }
    if (seen.has(current)) {
      throw new Error("Cannot serialize circular input.");
    }
    seen.add(current);
    if (Array.isArray(current)) {
      return current.map(walk);
    }
    return Object.fromEntries(Object.entries(current).map(([key, item]) => [key, walk(item)]));
  };

  return { value: walk(value) as T, intents };
}

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

let currentEngine: Engine | undefined;

export function useEngine(engine: Engine): void {
  currentEngine = engine;
}

export function agent<
  const Input extends InputSpec = ObjectSchema<{ text: StringSchema }>,
  const Output extends OutputSpec = ObjectSchema<{ text: StringSchema }>
>(spec: AgentSpec<Input, Output>): AgentFn<InferInputSpec<Input>, InferOutputSpec<Output>>;
export function agent(spec: AgentSpec<any, any>): AgentFn<any, any> {
  const normalizedSpec = normalizeSpec(spec);
  const inputResolved = unwrapInput(spec.input);
  const outputResolved = unwrapOutput(spec.output);
  const inputSchema = inputResolved.schema;
  const outputSchema = outputResolved.schema;

  const fn = (async (input: unknown, options: CallOptions = {}) => {
    const model = options.model ?? normalizedSpec.model ?? "gpt-4.1";
    const maxTurns = options.maxTurns ?? normalizedSpec.maxTurns ?? 4;
    const signal = timeoutSignal(options.signal, options.timeout ?? normalizedSpec.timeout);
    const repair: RepairHandler = options.repair ?? normalizedSpec.repair ?? outputResolved.repair ?? "default";
    const extensions = collectExtensions(normalizedSpec);
    const engine = composeEngine(getEngine(), extensions);
    const session = engine.createSession({ model });
    const normalizedInput = normalizeInput(input, inputSchema);
    let prompt = renderPrompt(normalizedSpec, normalizedInput, inputResolved.render, outputSchema);
    let lastResponse = "";

    const emit = async (event: ExtensionEvent) => {
      for (const ext of extensions) {
        if (ext.on) await ext.on(event);
      }
    };

    const fail = async (error: unknown): Promise<never> => {
      await emit({ type: "error", agent: normalizedSpec.name, turn: 0, error });
      throw error;
    };

    for (let turn = 1; turn <= maxTurns; turn += 1) {
      try {
        throwIfAborted(signal);
      } catch (err) {
        return fail(err);
      }

      await emit({ type: "call", agent: normalizedSpec.name, turn, prompt });

      try {
        lastResponse = await session.send(prompt, signal ? { signal } : {});
      } catch (err) {
        return fail(err);
      }

      let parsed: { ok: true; value: unknown } | { ok: false; error: string };
      if (outputResolved.parse) {
        try {
          parsed = { ok: true, value: outputResolved.parse(lastResponse) };
        } catch (err) {
          parsed = { ok: false, error: err instanceof Error ? err.message : String(err) };
        }
      } else {
        parsed = parseJson(lastResponse);
      }

      if (parsed.ok) {
        const result = validate(parsed.value, outputSchema);
        if (result.ok) {
          await emit({ type: "result", agent: normalizedSpec.name, turn, value: parsed.value });
          return parsed.value;
        }

        const error = new AgentError({
          kind: "validation",
          agent: normalizedSpec.name,
          turn,
          response: lastResponse,
          schema: outputSchema,
          message: `Agent ${normalizedSpec.name} output validation failed: ${result.error}`,
        });

        if (turn === maxTurns || repair === false) {
          return fail(error);
        }

        prompt = applyRepair(repair, normalizedSpec, error);
        continue;
      }

      const error = new AgentError({
        kind: "parse",
        agent: normalizedSpec.name,
        turn,
        response: lastResponse,
        schema: outputSchema,
        message: `Agent ${normalizedSpec.name} returned invalid JSON: ${parsed.error}`,
      });

      if (turn === maxTurns || repair === false) {
        return fail(error);
      }

      prompt = applyRepair(repair, normalizedSpec, error);
    }

    return fail(new Error(`Agent ${normalizedSpec.name} failed after ${maxTurns} turns. Last response:\n${lastResponse}`));
  }) as AgentFn<any, any>;

  fn.agentName = normalizedSpec.name;
  fn.inputSchema = inputSchema;
  fn.outputSchema = outputSchema;
  fn.inputShape = inputSchema;
  fn.outputShape = outputSchema;
  fn.spec = normalizedSpec;
  fn._namespace = normalizedSpec.name;
  return fn;
}

function composeEngine(base: Engine, extensions: readonly Extension[]): Engine {
  // First registered = outermost. [A, B] -> A(B(base)).
  let engine = base;
  for (let i = extensions.length - 1; i >= 0; i -= 1) {
    const wrap = extensions[i].wrapEngine;
    if (wrap) engine = wrap(engine);
  }
  return engine;
}

function applyRepair(repair: Exclude<RepairHandler, false>, spec: AgentSpec<any, any>, error: AgentError): string {
  if (typeof repair === "function") return repair(error);
  return defaultRepairPrompt(spec, error);
}

export type AgentFactory = typeof agent;

export function validate(value: unknown, schemaLike: SchemaLike): ValidationResult {
  return validateSchema(value, normalizeSchema(schemaLike), "$", false);
}

function normalizeSpec(specOrName: AgentSpec<any, any>): AgentSpec<any, any> {
  const spec: AgentSpec<any, any> = {
    name: specOrName.name,
  };
  if (specOrName.instructions !== undefined) spec.instructions = specOrName.instructions;
  if (specOrName.input !== undefined) spec.input = specOrName.input;
  if (specOrName.output !== undefined) spec.output = specOrName.output;
  if (specOrName.model !== undefined) spec.model = specOrName.model;
  if (specOrName.timeout !== undefined) spec.timeout = specOrName.timeout;
  if (specOrName.maxTurns !== undefined) spec.maxTurns = specOrName.maxTurns;
  if (specOrName.repair !== undefined) spec.repair = specOrName.repair;
  if (specOrName.permissions !== undefined) spec.permissions = specOrName.permissions;
  if (specOrName.agents !== undefined) spec.agents = specOrName.agents;
  if (specOrName.extensions !== undefined) spec.extensions = specOrName.extensions;
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

function normalizeSchema(schemaLike: SchemaLike): Schema {
  if (isSchema(schemaLike)) {
    return schemaLike;
  }
  if (typeof schemaLike === "string") {
    return s.string;
  }
  if (typeof schemaLike === "number") {
    return s.number;
  }
  if (typeof schemaLike === "boolean") {
    return s.boolean;
  }
  if (Array.isArray(schemaLike)) {
    return s.array(normalizeSchema(schemaLike[0] ?? s.unknown));
  }
  if (schemaLike && typeof schemaLike === "object") {
    if ("*" in schemaLike) {
      return s.record(normalizeSchema(schemaLike["*"]));
    }
    const fields = Object.fromEntries(
      Object.entries(schemaLike).map(([key, value]) => {
        if (key.endsWith("_")) {
          return [key.slice(0, -1), s.optional(normalizeSchema(value))];
        }
        return [key, normalizeSchema(value)];
      }),
    );
    return s.object(fields);
  }
  return s.unknown;
}

function renderPrompt(spec: AgentSpec<any, any>, input: unknown, customRender: ((value: unknown) => string) | undefined, outputSchema: Schema): string {
  const inlined = inlineShellPrompts(input);
  const inputSection = customRender ? customRender(inlined) : json(inlined);
  const sections = [
    tag("instructions", (spec.instructions ?? "Return only valid JSON matching the output schema.").trim()),
    tag("output_schema", renderSchema(outputSchema)),
    tag("input", inputSection),
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

function defaultRepairPrompt(spec: AgentSpec<any, any>, error: AgentError): string {
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
      return value === null ? ok() : validateSchema(value, normalizeSchema(schema.inner), path, false);
    case "optional":
      return validateSchema(value, normalizeSchema(schema.inner), path, true);
    case "array": {
      if (!Array.isArray(value)) {
        return bad(path, "array", value);
      }
      for (let index = 0; index < value.length; index += 1) {
        const result = validateSchema(value[index], normalizeSchema(schema.item), `${path}[${index}]`, false);
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
        const result = validateSchema(item, normalizeSchema(schema.value), `${path}.${key}`, false);
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
      for (const [key, fieldSchema] of Object.entries(schema.fields)) {
        const result = validateSchema(
          (value as Record<string, unknown>)[key],
          normalizeSchema(fieldSchema as SchemaLike),
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

function renderSchema(schemaLike: SchemaLike): string {
  const schema = normalizeSchema(schemaLike);
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
      return `${renderSchemaNode(normalizeSchema(schema.inner), indent)} | null`;
    case "optional":
      return `${renderSchemaNode(normalizeSchema(schema.inner), indent)} | undefined`;
    case "array":
      return `${renderSchemaNode(normalizeSchema(schema.item), indent)}[]`;
    case "record":
      return `{\n${pad}  [key: string]: ${renderSchemaNode(normalizeSchema(schema.value), indent + 1)};\n${pad}}`;
    case "object": {
      const lines = ["{"];
      for (const [key, value] of Object.entries(schema.fields)) {
        if (isSchema(value) && value.kind === "optional") {
          lines.push(`${pad}  ${key}?: ${renderSchemaNode(normalizeSchema(value.inner), indent + 1)};`);
        } else {
          lines.push(`${pad}  ${key}: ${renderSchemaNode(normalizeSchema(value as SchemaLike), indent + 1)};`);
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
    if (isShIntent(current)) {
      return renderShellPrompt(current);
    }
    if (isIntent(current)) {
      return renderGenericIntent(current);
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

function renderGenericIntent(intent: Intent): string {
  // Annotation-only default: extensions describe the intent kind/payload to the
  // model. Engines do not resolve generic intents in phase 1.
  return `<intent kind="${escapeAttribute(intent.kind)}">${json(intent.payload)}</intent>`;
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

function getEngine(): Engine {
  currentEngine ??= copilotEngine();
  return currentEngine;
}

function isSchema(value: unknown): value is Schema {
  return !!value
    && typeof value === "object"
    && "kind" in value
    && ["string", "number", "boolean", "unknown", "array", "object", "record", "enum", "literal", "nullable", "optional"].includes((value as { kind: string }).kind);
}

function isShIntent(value: unknown): value is ShIntent {
  return !!value && typeof value === "object" && (value as { __rig?: string }).__rig === "sh";
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
