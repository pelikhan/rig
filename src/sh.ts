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
  mode: "sh.text" | "sh.result" | "sh.write";
  command?: string;
  path?: string;
  contents?: string;
  options?: Omit<ShOptions, "signal">;
};

let nextIntentId = 1;

export const sh = {
  text(command: string, options?: ShOptions): ShIntent {
    return createIntent("sh.text", withOptions({ command }, options));
  },
  result(command: string, options?: ShOptions): ShIntent {
    return createIntent("sh.result", withOptions({ command }, options));
  },
  write(path: string, contents: string, options?: ShOptions): ShIntent {
    return createIntent("sh.write", withOptions({ path, contents }, options));
  },
};

export function collectIntents<T>(value: T): { value: T; intents: ShIntent[] } {
  const intents: ShIntent[] = [];
  const seen = new WeakSet<object>();

  const walk = (current: unknown): unknown => {
    if (isShIntent(current)) {
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

function isShIntent(value: unknown): value is ShIntent {
  return !!value && typeof value === "object" && (value as { __rig?: string }).__rig === "sh";
}
