import { CopilotClient } from "@github/copilot-sdk";
import { format } from "node:util";

const logEnabled = !!(process.env["RIG_LOG"] || process.env["RIG_DEBUG"]);
type Logger = (msg: string, ...args: unknown[]) => void;
function createLogger(namespace: string): Logger {
  if (!logEnabled) return () => {};
  return (msg, ...args) => {
    const line = JSON.stringify({ ts: Date.now(), ns: namespace, msg: format(msg, ...args) });
    process.stderr.write(line + "\n");
  };
}

type Log = {
  agent: Logger;
  engine: Logger;
  validate: Logger;
};

function createLog(namespace: string): Log {
  return {
    agent: createLogger(`rig:${namespace}:agent`),
    engine: createLogger(`rig:${namespace}:engine`),
    validate: createLogger(`rig:${namespace}:validate`),
  };
}

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type Permissions = {
  shell?: "deny" | "readonly" | "ask" | "allow";
  write?: "deny" | "workspace" | "allow";
};
type MaybePromise<T> = T | Promise<T>;
export type Phase =
  | "beforeCall"
  | "beforeSend"
  | "afterSend"
  | "afterParse"
  | "afterValidate"
  | "afterCall"
  | "error";
export type AgentContext = {
  agent: string;
  namespace: string;
  model: string;
  turn: number;
  phase: Phase;
  input: unknown;
  prompt: string;
  response?: string;
  parsed?: unknown;
  output?: unknown;
  error?: Error;
  signal?: AbortSignal | undefined;
};
export type Middleware = (ctx: AgentContext, next: () => Promise<void>) => Promise<void>;
/** @deprecated Use middleware instead. */
export type Hooks = {
  beforeCall?(ctx: { agent: string; input: any }): MaybePromise<any>;
  beforeSend?(ctx: { agent: string; prompt: string; turn: number }): MaybePromise<string | void>;
  afterSend?(ctx: { agent: string; response: string; turn: number }): MaybePromise<string | void>;
  afterParse?(ctx: { agent: string; parsed: any; turn: number }): MaybePromise<any>;
  onError?(ctx: { agent: string; error: string; response: string; turn: number }): MaybePromise<string | void>;
  afterCall?(ctx: { agent: string; input: any; output: any }): MaybePromise<void>;
};
export type AgentOptions<I = any, O = any> = {
  model?: string;
  timeout?: number;
  max_turns?: number;
  input?: I;
  output?: O;
  instructions?: string;
  permissions?: Permissions;
  agents?: Record<string, AgentFn<any, any>>;
  middleware?: Middleware[];
  /** @deprecated Use middleware instead. */
  hooks?: Hooks;
};
export type CallOptions = {
  signal?: AbortSignal;
  timeout?: number;
  model?: string;
  max_turns?: number;
};
export type AgentFn<I = any, O = any> = ((input?: Infer<I>, options?: CallOptions) => Promise<Infer<O>>) & {
  agentName: string;
  inputShape: I;
  outputShape: O;
  _namespace: string;
  use(middleware: Middleware): () => void;
};
export type ShOptions = {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  purpose?: string;
  signal?: AbortSignal;
};

type Marker =
  | { __rig: "enum"; values: readonly Json[] }
  | { __rig: "literal"; value: Json }
  | { __rig: "nullable"; shape: any }
  | { __rig: "unknown" };

type ShIntent = {
  __rig: "sh";
  id: string;
  mode: "sh.text" | "sh.result" | "sh.write";
  command?: string;
  path?: string;
  contents?: string;
  options?: Omit<ShOptions, "signal">;
};

type Infer<T> = T extends { __rig: "enum"; values: readonly (infer U)[] } ? U :
  T extends { __rig: "literal"; value: infer U } ? U :
  T extends { __rig: "nullable"; shape: infer U } ? Infer<U> | null :
  T extends { __rig: "unknown" } ? unknown :
  T extends string ? string : T extends number ? number : T extends boolean ? boolean :
  T extends readonly [infer U] ? Infer<U>[] :
  T extends readonly any[] ? any[] :
  T extends object ? { [K in keyof T as K extends `${infer P}_` ? P : K]: Infer<T[K]> } : any;

export type Engine = {
  createSession(options: { model: string }): EngineSession;
};

export type EngineSession = {
  send(prompt: string, options: { signal?: AbortSignal }): Promise<string>;
};

let engine: Engine | undefined;
let nextIntentId = 1;
const globalMiddleware: Middleware[] = [];

export function useEngine(next: Engine): void { engine = next; }

export const sh = {
  text(command: string, options?: ShOptions): any {
    return intent("sh.text", options ? { command, options: stripSignal(options)! } : { command });
  },
  result(command: string, options?: ShOptions): any {
    return intent("sh.result", options ? { command, options: stripSignal(options)! } : { command });
  },
  write(path: string, contents: string, options?: ShOptions): any {
    return intent("sh.write", options ? { path, contents, options: stripSignal(options)! } : { path, contents });
  },
};

export function agent<I = { text: string }, O = { text: string }>(
  name: string,
  options: AgentOptions<I, O> = {},
): AgentFn<I, O> {
  const namespace = name;
  const lg = createLog(namespace);
  const inputShape = (options.input ?? { text: "input text" }) as I;
  const outputShape = (options.output ?? { text: "output text" }) as O;
  const localMiddleware: Middleware[] = [
    ...(options.middleware ?? []),
    ...(options.hooks ? [hookAdapter(options.hooks)] : []),
  ];
  lg.agent("define model=%s max_turns=%d", options.model ?? "gpt-4.1", options.max_turns ?? 4);

  // Re-namespace subagents under this agent's path
  if (options.agents) {
    for (const [key, sub] of Object.entries(options.agents)) {
      const childNs = `${namespace}:${sub._namespace ?? sub.agentName ?? key}`;
      (sub as AgentFn)._namespace = childNs;
    }
  }

  const fn = async (input?: Infer<I>, call: CallOptions = {}) => {
    const signal = timeoutSignal(call.signal, call.timeout ?? options.timeout);
    const maxTurns = call.max_turns ?? options.max_turns ?? 4;
    const model = call.model ?? options.model ?? "gpt-4.1";
    let actualInput: any = input ?? ({ text: "" } as Infer<I>);

    // Use the runtime namespace (may have been nested by a parent)
    const runtimeNs = (fn as AgentFn)._namespace;
    const l = runtimeNs !== namespace ? createLog(runtimeNs) : lg;
    const middleware = collectMiddleware(localMiddleware);
    const ctx: AgentContext = {
      agent: name,
      namespace: runtimeNs,
      model,
      turn: 0,
      phase: "beforeCall",
      input: actualInput,
      prompt: "",
      signal,
    };

    l.agent("call model=%s", model);
    await runPhase(ctx, middleware, "beforeCall");
    actualInput = ctx.input;

    const session = getEngine().createSession({ model });
    l.engine("session created");
    let prompt = renderPrompt(name, options, inputShape, outputShape, actualInput);
    let last = "";
    for (let turn = 1; turn <= maxTurns; turn++) {
      throwIfAborted(signal);
      ctx.turn = turn;
      ctx.prompt = prompt;
      await runPhase(ctx, middleware, "beforeSend");
      prompt = ctx.prompt;
      l.engine("send turn=%d prompt_len=%d", turn, prompt.length);
      last = await session.send(prompt, signal ? { signal } : {});
      l.engine("recv turn=%d response_len=%d", turn, last.length);
      ctx.response = last;
      await runPhase(ctx, middleware, "afterSend");
      last = ctx.response ?? last;
      const parsed = tryParseJson(last);
      if (parsed.ok) {
        ctx.parsed = parsed.value;
        await runPhase(ctx, middleware, "afterParse");
        const value = ctx.parsed;
        const v = validate(value, outputShape);
        if (v.ok) {
          l.agent("ok turn=%d", turn);
          const output = stripOptionalKeys(value) as Infer<O>;
          ctx.output = output;
          await runPhase(ctx, middleware, "afterValidate");
          await runPhase(ctx, middleware, "afterCall");
          return ctx.output as Infer<O>;
        }
        l.validate("fail turn=%d %s", turn, v.error);
        ctx.error = new Error(`Output validation failed: ${v.error}`);
        await runPhase(ctx, middleware, "error");
        if (ctx.prompt && ctx.prompt !== prompt) { prompt = ctx.prompt; continue; }
        throw new Error(`Agent ${name} output validation failed: ${v.error}\nResponse:\n${last}`);
      } else {
        l.validate("parse_fail turn=%d %s", turn, parsed.error);
        ctx.error = new Error(`Response was not valid JSON: ${parsed.error}`);
        await runPhase(ctx, middleware, "error");
        if (ctx.prompt && ctx.prompt !== prompt) { prompt = ctx.prompt; continue; }
        throw new Error(`Agent ${name} returned invalid JSON: ${parsed.error}\nResponse:\n${last}`);
      }
    }
    throw new Error(`Agent ${name} failed to produce valid output after ${maxTurns} turn(s). Last response:\n${last}`);
  };
  (fn as AgentFn<I, O>).agentName = name;
  (fn as AgentFn<I, O>).inputShape = inputShape;
  (fn as AgentFn<I, O>).outputShape = outputShape;
  (fn as AgentFn<I, O>)._namespace = namespace;
  (fn as AgentFn<I, O>).use = function use(middleware: Middleware): () => void {
    localMiddleware.push(middleware);
    return () => {
      const i = localMiddleware.indexOf(middleware);
      if (i >= 0) localMiddleware.splice(i, 1);
    };
  };
  return fn as AgentFn<I, O>;
}

agent.use = function use(middleware: Middleware): () => void {
  globalMiddleware.push(middleware);
  return () => {
    const i = globalMiddleware.indexOf(middleware);
    if (i >= 0) globalMiddleware.splice(i, 1);
  };
};

/** @deprecated Use agent.use() with middleware instead. */
agent.on = function on(hooks: Hooks): () => void {
  const mw = hookAdapter(hooks);
  return agent.use(mw);
};

agent.enum = function values<T extends readonly Json[]>(values: T): { __rig: "enum"; values: T } {
  return { __rig: "enum", values };
};
agent.literal = function literal<T extends Json>(value: T): { __rig: "literal"; value: T } {
  return { __rig: "literal", value };
};
agent.nullable = function nullable<T>(shape: T): { __rig: "nullable"; shape: T } {
  return { __rig: "nullable", shape };
};
agent.unknown = function unknown(): { __rig: "unknown" } {
  return { __rig: "unknown" };
};

export type AgentFactory = typeof agent & {
  use(middleware: Middleware): () => void;
  /** @deprecated Use use(middleware) instead. */
  on(hooks: Hooks): () => void;
  enum<T extends readonly Json[]>(values: T): { __rig: "enum"; values: T };
  literal<T extends Json>(value: T): { __rig: "literal"; value: T };
  nullable<T>(shape: T): { __rig: "nullable"; shape: T };
  unknown(): { __rig: "unknown" };
};

function collectMiddleware(local: Middleware[]): Middleware[] {
  return [...globalMiddleware, ...local];
}

async function runPhase(ctx: AgentContext, middleware: Middleware[], phase: Phase): Promise<void> {
  ctx.phase = phase;
  await runMiddleware(ctx, middleware, async () => {});
}

async function runMiddleware(
  ctx: AgentContext,
  middleware: Middleware[],
  terminal: () => Promise<void>,
): Promise<void> {
  let i = -1;
  async function dispatch(index: number): Promise<void> {
    if (index <= i) throw new Error("next() called multiple times");
    i = index;
    const fn = middleware[index];
    if (!fn) return terminal();
    return fn(ctx, () => dispatch(index + 1));
  }
  return dispatch(0);
}

function hookAdapter(hooks: Hooks): Middleware {
  return async (ctx, next) => {
    if (ctx.phase === "beforeCall" && hooks.beforeCall) {
      ctx.input = (await hooks.beforeCall({ agent: ctx.agent, input: ctx.input })) ?? ctx.input;
    }
    if (ctx.phase === "beforeSend" && hooks.beforeSend) {
      ctx.prompt = (await hooks.beforeSend({ agent: ctx.agent, prompt: ctx.prompt, turn: ctx.turn })) ?? ctx.prompt;
    }
    if (ctx.phase === "afterSend" && hooks.afterSend && ctx.response !== undefined) {
      ctx.response = (await hooks.afterSend({ agent: ctx.agent, response: ctx.response, turn: ctx.turn })) ?? ctx.response;
    }
    if (ctx.phase === "afterParse" && hooks.afterParse) {
      ctx.parsed = (await hooks.afterParse({ agent: ctx.agent, parsed: ctx.parsed, turn: ctx.turn })) ?? ctx.parsed;
    }
    if (ctx.phase === "afterCall" && hooks.afterCall) {
      await hooks.afterCall({ agent: ctx.agent, input: ctx.input, output: ctx.output });
    }
    if (ctx.phase === "error" && hooks.onError && ctx.error && ctx.response !== undefined) {
      const retry = await hooks.onError({ agent: ctx.agent, error: ctx.error.message, response: ctx.response, turn: ctx.turn });
      if (typeof retry === "string") ctx.prompt = retry;
    }
    await next();
  };
}

function intent(mode: ShIntent["mode"], args: Omit<Partial<ShIntent>, "__rig" | "id" | "mode">): ShIntent {
  return { __rig: "sh", id: `intent_${nextIntentId++}`, mode, ...args } as ShIntent;
}

function getEngine(): Engine {
  if (!engine) engine = new CopilotEngine();
  return engine;
}

class CopilotEngine implements Engine {
  createSession(options: { model: string }): EngineSession {
    let session: any;
    return {
      async send(prompt: string, opts: { signal?: AbortSignal }): Promise<string> {
        if (!session) {
          session = await new CopilotClient().createSession({ model: options.model, streaming: false });
        }
        const response = await session.sendAndWait({ prompt, signal: opts.signal } as any);
        if (typeof response === "string") return response;
        const r = response as any;
        return r?.text ?? r?.content ?? r?.data?.text ?? r?.data?.content ?? JSON.stringify(response);
      },
    };
  }
}

function renderPrompt<I, O>(name: string, options: AgentOptions<I, O>, inputShape: I, outputShape: O, input: any): string {
  const { value, intents } = collectIntents(input);
  const subagents = Object.entries(options.agents ?? {}).map(([k, a]) => ({
    name: k,
    input: typeText(a.inputShape),
    output: typeText(a.outputShape),
  }));
  return [
    `<agent name="${name}">`,
    "",
    "<instructions>",
    options.instructions?.trim() || "Complete the task. Return only the declared output shape.",
    "</instructions>",
    "",
    "<input_schema>",
    typeText(inputShape),
    "</input_schema>",
    "",
    "<output_schema>",
    typeText(outputShape),
    "</output_schema>",
    "",
    "<permissions>",
    json(options.permissions ?? { shell: "readonly", write: "deny" }),
    "</permissions>",
    "",
    subagents.length ? `<subagents>\n${json(subagents)}\n</subagents>` : "<subagents/>",
    "",
    "<input>",
    json(value),
    "</input>",
    "",
    "<intents>",
    intents.length ? intents.map(renderIntent).join("\n") : "(none)",
    "</intents>",
    "",
    "<rules>",
    "Resolve each intent using the underlying agentic engine's native execution capabilities:",
    "- mode `sh.text`: run the command and substitute its stdout as a string.",
    "- mode `sh.result`: run the command and substitute `{ ok, stdout, stderr, exitCode }`.",
    "- mode `sh.write`: write contents to path and substitute `{ ok, stdout, stderr, exitCode }`.",
    "These intents are declarative. They are not framework-level tools, host JavaScript calls, or promises.",
    "Respect the permissions declaration when deciding whether an intent may be resolved.",
    "Do not fabricate intent results. Resolve them through the engine or report failure in the output.",
    "Return only one valid JSON object matching the output schema. No Markdown. No prose outside JSON.",
    "</rules>",
    "",
    "</agent>",
  ].join("\n");
}

function renderIntent(i: ShIntent): string {
  if (i.mode === "sh.write") {
    const opts = i.options ? ` ${json(i.options)}` : "";
    return `<intent id="${i.id}" mode="${i.mode}" path="${i.path}"${opts}>\n${i.contents}\n</intent>`;
  }
  const opts = i.options ? ` ${json(i.options)}` : "";
  return `<intent id="${i.id}" mode="${i.mode}"${opts}>\`${i.command}\`</intent>`;
}

export function collectIntents(value: any): { value: any; intents: ShIntent[] } {
  const intents: ShIntent[] = [];
  const seen = new WeakSet<object>();
  const walk = (v: any): any => {
    if (isShIntent(v)) {
      intents.push(v);
      return { $intent: v.id };
    }
    if (!v || typeof v !== "object") return v;
    if (seen.has(v)) throw new Error("Cannot serialize circular input.");
    seen.add(v);
    if (Array.isArray(v)) return v.map(walk);
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
  };
  return { value: walk(value), intents };
}

export function validate(value: any, shape: any, path = "$", optional = false): { ok: true } | { ok: false; error: string } {
  if (optional && value === undefined) return { ok: true };
  if (isMarker(shape)) return validateMarker(value, shape, path);
  if (typeof shape === "string") return typeof value === "string" ? ok() : bad(path, "string", value);
  if (typeof shape === "number") return typeof value === "number" ? ok() : bad(path, "number", value);
  if (typeof shape === "boolean") return typeof value === "boolean" ? ok() : bad(path, "boolean", value);
  if (Array.isArray(shape)) {
    if (!Array.isArray(value)) return bad(path, "array", value);
    if (shape.length === 0) return ok();
    for (let i = 0; i < value.length; i++) {
      const r = validate(value[i], shape[0], `${path}[${i}]`);
      if (!r.ok) return r;
    }
    return ok();
  }
  if (shape && typeof shape === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) return bad(path, "object", value);
    const wildcard = (shape as any)["*"];
    if (wildcard !== undefined) {
      for (const [k, v] of Object.entries(value)) {
        const r = validate(v, wildcard, `${path}.${k}`);
        if (!r.ok) return r;
      }
      return ok();
    }
    for (const [rawKey, child] of Object.entries(shape)) {
      const isOpt = rawKey.endsWith("_");
      const key = isOpt ? rawKey.slice(0, -1) : rawKey;
      const r = validate((value as any)[key], child, `${path}.${key}`, isOpt);
      if (!r.ok) return r;
    }
    return ok();
  }
  return ok();
}

function validateMarker(value: any, marker: Marker, path: string): { ok: true } | { ok: false; error: string } {
  if (marker.__rig === "unknown") return ok();
  if (marker.__rig === "nullable") return value === null ? ok() : validate(value, marker.shape, path);
  if (marker.__rig === "literal") return deepEqual(value, marker.value) ? ok() : bad(path, `literal ${JSON.stringify(marker.value)}`, value);
  return marker.values.some((v) => deepEqual(v, value)) ? ok() : bad(path, `one of ${JSON.stringify(marker.values)}`, value);
}

function typeText(shape: any, indent = 0): string {
  const pad = "  ".repeat(indent);
  if (isMarker(shape)) {
    if (shape.__rig === "enum") return shape.values.map((v) => JSON.stringify(v)).join(" | ");
    if (shape.__rig === "literal") return JSON.stringify(shape.value);
    if (shape.__rig === "nullable") return `${typeText(shape.shape, indent)} | null`;
    return "unknown";
  }
  if (typeof shape === "string") return "string";
  if (typeof shape === "number") return "number";
  if (typeof shape === "boolean") return "boolean";
  if (Array.isArray(shape)) return `${typeText(shape[0] ?? "", indent)}[]`;
  if (shape && typeof shape === "object") {
    const lines = ["{"];
    for (const [rawKey, v] of Object.entries(shape)) {
      if (rawKey === "*") lines.push(`${pad}  [key: string]: ${typeText(v, indent + 1)};`);
      else {
        const opt = rawKey.endsWith("_");
        const key = opt ? rawKey.slice(0, -1) : rawKey;
        lines.push(`${pad}  ${key}${opt ? "?" : ""}: ${typeText(v, indent + 1)};`);
      }
    }
    lines.push(`${pad}}`);
    return lines.join("\n");
  }
  return "unknown";
}

function tryParseJson(text: string): { ok: true; value: any } | { ok: false; error: string } {
  try { return { ok: true, value: JSON.parse(text) }; } catch {}
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? text.match(/\{[\s\S]*\}/);
  if (!m) return { ok: false, error: "No JSON object found." };
  try { return { ok: true, value: JSON.parse(m[1] ?? m[0]) }; }
  catch (e: any) { return { ok: false, error: e?.message ?? String(e) }; }
}

function stripOptionalKeys(v: any): any { return v; }
function isMarker(v: any): v is Marker { return v && typeof v === "object" && ["enum", "literal", "nullable", "unknown"].includes(v.__rig); }
function isShIntent(v: any): v is ShIntent { return v && typeof v === "object" && v.__rig === "sh"; }
function ok(): { ok: true } { return { ok: true }; }
function bad(path: string, expected: string, actual: any): { ok: false; error: string } {
  return { ok: false, error: `${path}: expected ${expected}, got ${actual === null ? "null" : Array.isArray(actual) ? "array" : typeof actual}` };
}
function json(v: any): string { return JSON.stringify(v, null, 2); }
function deepEqual(a: any, b: any): boolean { return JSON.stringify(a) === JSON.stringify(b); }
function stripSignal(o?: ShOptions): Omit<ShOptions, "signal"> | undefined {
  if (!o) return undefined;
  const { signal: _signal, ...rest } = o;
  return rest;
}
function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw signal.reason ?? new DOMException("Aborted", "AbortError");
}
function timeoutSignal(parent?: AbortSignal, timeout?: number): AbortSignal | undefined {
  if (!timeout) return parent;
  const controller = new AbortController();
  const onAbort = () => controller.abort(parent?.reason);
  parent?.addEventListener("abort", onAbort, { once: true });
  const t = setTimeout(() => controller.abort(new Error(`Timed out after ${timeout}ms`)), timeout);
  controller.signal.addEventListener("abort", () => clearTimeout(t), { once: true });
  return controller.signal;
}
