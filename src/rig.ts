import { collectIntents, sh } from "./sh.js";
import type { ShIntent } from "./sh.js";
import { copilotEngine } from "./engines/copilot.js";

export { collectIntents, sh };
export type { ShIntent, ShOptions } from "./sh.js";

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

export type LegacyMarker =
  | { __rig: "enum"; values: readonly Json[] }
  | { __rig: "literal"; value: Json }
  | { __rig: "nullable"; shape: SchemaLike }
  | { __rig: "unknown" };

export type SchemaLike = Schema | LegacyMarker | string | number | boolean | readonly [SchemaLike] | { [key: string]: SchemaLike };

export type Simplify<T> = { [K in keyof T]: T[K] } & {};
export type AgentInputValue<T> =
  T extends readonly (infer Item)[] ? ShIntent | AgentInputValue<Item>[] :
  T extends object ? ShIntent | { [K in keyof T]: AgentInputValue<T[K]> } :
  T | ShIntent;

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
  T extends { __rig: "enum"; values: infer Values extends readonly unknown[] } ? Values[number] :
  T extends { __rig: "literal"; value: infer Value } ? Value :
  T extends { __rig: "nullable"; shape: infer Inner } ? InferSchema<Inner> | null :
  T extends { __rig: "unknown" } ? unknown :
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

export type AgentSpec<Input extends SchemaLike = ObjectSchema<{ text: StringSchema }>, Output extends SchemaLike = ObjectSchema<{ text: StringSchema }>> = {
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

export type LegacyAgentOptions<Input = { text: string }, Output = { text: string }> = {
  instructions?: string;
  input?: Input;
  output?: Output;
  model?: string;
  timeout?: number;
  maxTurns?: number;
  max_turns?: number;
  repair?: RepairHandler;
  permissions?: AgentSpec["permissions"];
  agents?: Record<string, AgentFn<any, any>>;
};

export type CallOptions = {
  signal?: AbortSignal;
  timeout?: number;
  model?: string;
  maxTurns?: number;
  max_turns?: number;
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
  const Input extends SchemaLike = ObjectSchema<{ text: StringSchema }>,
  const Output extends SchemaLike = ObjectSchema<{ text: StringSchema }>
>(spec: AgentSpec<Input, Output>): AgentFn<InferSchema<Input>, InferSchema<Output>>;
export function agent<
  const Input = { text: string },
  const Output = { text: string }
>(name: string, options?: LegacyAgentOptions<Input, Output>): AgentFn<InferSchema<Input>, InferSchema<Output>>;
export function agent(specOrName: string | AgentSpec<any, any>, maybeOptions: LegacyAgentOptions<any, any> = {}): AgentFn<any, any> {
  const spec = normalizeSpec(specOrName, maybeOptions);
  const inputSchema = spec.input ?? s.object({ text: s.string });
  const outputSchema = spec.output ?? s.object({ text: s.string });

  const fn = (async (input: unknown, options: CallOptions = {}) => {
    const model = options.model ?? spec.model ?? "gpt-4.1";
    const maxTurns = options.maxTurns ?? options.max_turns ?? spec.maxTurns ?? 4;
    const signal = timeoutSignal(options.signal, options.timeout ?? spec.timeout);
    const repair = spec.repair ?? "default";
    const session = getEngine().createSession({ model });
    const normalizedInput = normalizeInput(input, inputSchema);
    let prompt = renderPrompt(spec, normalizedInput);
    let lastResponse = "";

    for (let turn = 1; turn <= maxTurns; turn += 1) {
      throwIfAborted(signal);
      lastResponse = await session.send(prompt, signal ? { signal } : {});

      const parsed = parseJson(lastResponse);
      if (parsed.ok) {
        const result = validate(parsed.value, outputSchema);
        if (result.ok) {
          return parsed.value;
        }

        const error = new AgentError({
          kind: "validation",
          agent: spec.name,
          turn,
          response: lastResponse,
          schema: outputSchema,
          message: `Agent ${spec.name} output validation failed: ${result.error}`,
        });

        if (turn === maxTurns || repair === false) {
          throw error;
        }

        prompt = repairPrompt(spec, error);
        continue;
      }

      const error = new AgentError({
        kind: "parse",
        agent: spec.name,
        turn,
        response: lastResponse,
        schema: outputSchema,
        message: `Agent ${spec.name} returned invalid JSON: ${parsed.error}`,
      });

      if (turn === maxTurns || repair === false) {
        throw error;
      }

      prompt = repairPrompt(spec, error);
    }

    throw new Error(`Agent ${spec.name} failed after ${maxTurns} turns. Last response:\n${lastResponse}`);
  }) as AgentFn<any, any>;

  fn.agentName = spec.name;
  fn.inputSchema = inputSchema;
  fn.outputSchema = outputSchema;
  fn.inputShape = inputSchema;
  fn.outputShape = outputSchema;
  fn.spec = spec;
  fn._namespace = spec.name;
  return fn;
}

agent.enum = function legacyEnum<const Values extends readonly Json[]>(values: Values): EnumSchema<Values> {
  return s.enum(...values);
};
agent.literal = function legacyLiteral<Value extends Json>(value: Value): LiteralSchema<Value> {
  return s.literal(value);
};
agent.nullable = function legacyNullable<Inner extends SchemaLike>(inner: Inner): NullableSchema<Inner> {
  return s.nullable(inner);
};
agent.unknown = function legacyUnknown(): UnknownSchema {
  return s.unknown;
};

export type AgentFactory = typeof agent & {
  enum<const Values extends readonly Json[]>(values: Values): EnumSchema<Values>;
  literal<Value extends Json>(value: Value): LiteralSchema<Value>;
  nullable<Inner extends SchemaLike>(inner: Inner): NullableSchema<Inner>;
  unknown(): UnknownSchema;
};

export function validate(value: unknown, schemaLike: SchemaLike): ValidationResult {
  return validateSchema(value, normalizeSchema(schemaLike), "$", false);
}

function normalizeSpec(specOrName: string | AgentSpec<any, any>, options: LegacyAgentOptions<any, any>): AgentSpec<any, any> {
  if (typeof specOrName === "string") {
    const spec: AgentSpec<any, any> = {
      name: specOrName,
    };
    if (options.instructions !== undefined) spec.instructions = options.instructions;
    if (options.input !== undefined) spec.input = normalizeSchema(options.input);
    if (options.output !== undefined) spec.output = normalizeSchema(options.output);
    if (options.model !== undefined) spec.model = options.model;
    if (options.timeout !== undefined) spec.timeout = options.timeout;
    const maxTurns = options.maxTurns ?? options.max_turns;
    if (maxTurns !== undefined) spec.maxTurns = maxTurns;
    if (options.repair !== undefined) spec.repair = options.repair;
    if (options.permissions !== undefined) spec.permissions = options.permissions;
    if (options.agents !== undefined) spec.agents = options.agents;
    return spec;
  }

  const spec: AgentSpec<any, any> = {
    name: specOrName.name,
  };
  if (specOrName.instructions !== undefined) spec.instructions = specOrName.instructions;
  if (specOrName.input !== undefined) spec.input = normalizeSchema(specOrName.input);
  if (specOrName.output !== undefined) spec.output = normalizeSchema(specOrName.output);
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

function normalizeSchema(schemaLike: SchemaLike): Schema {
  if (isSchema(schemaLike)) {
    return schemaLike;
  }
  if (isLegacyMarker(schemaLike)) {
    switch (schemaLike.__rig) {
      case "enum":
        return s.enum(...schemaLike.values);
      case "literal":
        return s.literal(schemaLike.value);
      case "nullable":
        return s.nullable(normalizeSchema(schemaLike.shape));
      case "unknown":
        return s.unknown;
      default:
        throw new Error(`Unknown legacy schema marker: ${(schemaLike as { __rig: string }).__rig}`);
    }
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

function renderPrompt(spec: AgentSpec<any, any>, input: unknown): string {
  const { value, intents } = collectIntents(input);
  const sections = [
    `<agent name="${escapeAttribute(spec.name)}">`,
    tag("instructions", (spec.instructions ?? "Return only valid JSON matching the output schema.").trim()),
    tag("input_schema", renderSchema(spec.input ?? s.object({ text: s.string }))),
    tag("output_schema", renderSchema(spec.output ?? s.object({ text: s.string }))),
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

  sections.push(tag("intents", intents.length ? intents.map(renderIntent).join("\n") : "(none)"));
  sections.push(tag("rules", [
    "Return exactly one JSON object.",
    "Do not wrap the JSON in Markdown.",
    "Match the output schema exactly.",
    "Shell intents are unresolved declarative placeholders unless the engine resolves them.",
  ].join("\n")));
  sections.push("</agent>");

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

function renderIntent(intent: { id: string; mode: string; command?: string; path?: string; contents?: string; options?: unknown }): string {
  const attributes = [
    `id="${escapeAttribute(intent.id)}"`,
    `mode="${escapeAttribute(intent.mode)}"`,
  ];
  if (intent.command) {
    attributes.push(`command="${escapeAttribute(intent.command)}"`);
  }
  if (intent.path) {
    attributes.push(`path="${escapeAttribute(intent.path)}"`);
  }
  return `<intent ${attributes.join(" ")}>${intent.options ? `${json(intent.options)} ` : ""}${intent.contents ?? ""}</intent>`;
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

function isLegacyMarker(value: unknown): value is LegacyMarker {
  return !!value
    && typeof value === "object"
    && "__rig" in value
    && ["enum", "literal", "nullable", "unknown"].includes((value as { __rig: string }).__rig);
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
