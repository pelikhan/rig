import { CopilotClient } from "@github/copilot-sdk";

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type Permissions = {
  shell?: "deny" | "readonly" | "ask" | "allow";
  write?: "deny" | "workspace" | "allow";
};
export type Hooks = {
  beforeCall?(ctx: { agent: string; input: any }): any;
  beforeSend?(ctx: { agent: string; prompt: string; turn: number }): string | void;
  afterSend?(ctx: { agent: string; response: string; turn: number }): string | void;
  afterParse?(ctx: { agent: string; parsed: any; turn: number }): any;
  onError?(ctx: { agent: string; error: string; response: string; turn: number }): string | void;
  afterCall?(ctx: { agent: string; input: any; output: any }): void;
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
const globalHooks: Hooks[] = [];

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
  const inputShape = (options.input ?? { text: "input text" }) as I;
  const outputShape = (options.output ?? { text: "output text" }) as O;
  const fn = async (input?: Infer<I>, call: CallOptions = {}) => {
    const signal = timeoutSignal(call.signal, call.timeout ?? options.timeout);
    const maxTurns = call.max_turns ?? options.max_turns ?? 4;
    const model = call.model ?? options.model ?? "gpt-4.1";
    const hooks = allHooks(options.hooks);
    let actualInput: any = input ?? ({ text: "" } as Infer<I>);

    actualInput = runHook(hooks, "beforeCall", { agent: name, input: actualInput }) ?? actualInput;

    const session = getEngine().createSession({ model });
    let prompt = renderPrompt(name, options, inputShape, outputShape, actualInput);
    let last = "";
    for (let turn = 1; turn <= maxTurns; turn++) {
      throwIfAborted(signal);
      prompt = runHook(hooks, "beforeSend", { agent: name, prompt, turn }) ?? prompt;
      last = await session.send(prompt, signal ? { signal } : {});
      last = runHook(hooks, "afterSend", { agent: name, response: last, turn }) ?? last;
      const parsed = tryParseJson(last);
      if (parsed.ok) {
        const transformed = runHook(hooks, "afterParse", { agent: name, parsed: parsed.value, turn });
        const value = transformed !== undefined ? transformed : parsed.value;
        const v = validate(value, outputShape);
        if (v.ok) {
          const output = stripOptionalKeys(value) as Infer<O>;
          runHook(hooks, "afterCall", { agent: name, input: actualInput, output });
          return output;
        }
        const retry = runHook(hooks, "onError", { agent: name, error: `Output validation failed: ${v.error}`, response: last, turn });
        if (typeof retry === "string") { prompt = retry; continue; }
        throw new Error(`Agent ${name} output validation failed: ${v.error}\nResponse:\n${last}`);
      } else {
        const retry = runHook(hooks, "onError", { agent: name, error: `Response was not valid JSON: ${parsed.error}`, response: last, turn });
        if (typeof retry === "string") { prompt = retry; continue; }
        throw new Error(`Agent ${name} returned invalid JSON: ${parsed.error}\nResponse:\n${last}`);
      }
    }
    throw new Error(`Agent ${name} failed to produce valid output after ${maxTurns} turn(s). Last response:\n${last}`);
  };
  (fn as AgentFn<I, O>).agentName = name;
  (fn as AgentFn<I, O>).inputShape = inputShape;
  (fn as AgentFn<I, O>).outputShape = outputShape;
  return fn as AgentFn<I, O>;
}

agent.on = function on(hooks: Hooks): () => void {
  globalHooks.push(hooks);
  return () => { const i = globalHooks.indexOf(hooks); if (i >= 0) globalHooks.splice(i, 1); };
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
  on(hooks: Hooks): () => void;
  enum<T extends readonly Json[]>(values: T): { __rig: "enum"; values: T };
  literal<T extends Json>(value: T): { __rig: "literal"; value: T };
  nullable<T>(shape: T): { __rig: "nullable"; shape: T };
  unknown(): { __rig: "unknown" };
};

function allHooks(local?: Hooks): Hooks[] {
  return local ? [...globalHooks, local] : globalHooks;
}

function runHook(hooks: Hooks[], name: keyof Hooks, ctx: any): any {
  let result: any;
  for (const h of hooks) {
    const fn = h[name] as ((ctx: any) => any) | undefined;
    if (fn) {
      const r = fn(ctx);
      if (r !== undefined) { result = r; ctx = { ...ctx, ...( typeof r === "string" ? (name === "beforeSend" ? { prompt: r } : name === "afterSend" ? { response: r } : {}) : {}) }; }
    }
  }
  return result;
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
        return r?.text ?? r?.content ?? JSON.stringify(response);
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
    `You are rig agent: ${name}.`,
    "",
    options.instructions?.trim() || "Complete the task. Return only the declared output shape.",
    "",
    "Input schema:",
    typeText(inputShape),
    "",
    "Output schema:",
    typeText(outputShape),
    "",
    "Permissions declaration:",
    json(options.permissions ?? { shell: "readonly", write: "deny" }),
    "",
    subagents.length ? `Available subagents:\n${json(subagents)}` : "Available subagents: []",
    "",
    "Input object. Values like {\"$intent\":\"intent_1\"} are not literal input; they reference engine intents below:",
    json(value),
    "",
    "Engine intents:",
    json(intents),
    "",
    "Resolve each intent using the underlying agentic engine's native execution capabilities:",
    "- mode sh.text: obtain stdout text for the command and substitute that string.",
    "- mode sh.result: obtain { ok, stdout, stderr, exitCode } for the command and substitute that object.",
    "- mode sh.write: write the requested contents to the path and substitute operation status { ok, stdout, stderr, exitCode }.",
    "These intents are declarative prompt intents. They are not framework-level tools, host JavaScript calls, or promises.",
    "Respect the permissions declaration when deciding whether an intent may be resolved.",
    "Do not fabricate intent results. Resolve them through the engine or report failure in the declared output shape if appropriate.",
    "",
    "Return only one valid JSON object matching the output schema. No Markdown. No prose outside JSON.",
  ].join("\n");
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
