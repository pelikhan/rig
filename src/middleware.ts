import type { AgentFn, CallOptions, Engine, EngineSession } from "./rig.js";

export type MiddlewareContext =
  | {
      kind: "agent";
      event: "call";
      agent: string;
      input: unknown;
      options: CallOptions;
    }
  | {
      kind: "agent";
      event: "result";
      agent: string;
      input: unknown;
      options: CallOptions;
      output: unknown;
    }
  | {
      kind: "agent";
      event: "error";
      agent: string;
      input: unknown;
      options: CallOptions;
      error: unknown;
    }
  | {
      kind: "engine";
      event: "send";
      model: string;
      prompt: string;
      options: { signal?: AbortSignal };
    }
  | {
      kind: "engine";
      event: "result";
      model: string;
      prompt: string;
      options: { signal?: AbortSignal };
      response: string;
    }
  | {
      kind: "engine";
      event: "error";
      model: string;
      prompt: string;
      options: { signal?: AbortSignal };
      error: unknown;
    };

export type Middleware = (context: MiddlewareContext, next: () => Promise<void>) => Promise<void>;

export function withMiddleware<I, O>(target: AgentFn<I, O>, middleware: Middleware[]): AgentFn<I, O>;
export function withMiddleware(target: Engine, middleware: Middleware[]): Engine;
export function withMiddleware(target: AgentFn<any, any> | Engine, middleware: Middleware[]): AgentFn<any, any> | Engine {
  if ("createSession" in target) {
    return wrapEngine(target, middleware);
  }
  return wrapAgent(target, middleware);
}

function wrapAgent<I, O>(target: AgentFn<I, O>, middleware: Middleware[]): AgentFn<I, O> {
  const wrapped = (async (input: I, options: CallOptions = {}) => {
    const callContext: MiddlewareContext = {
      kind: "agent",
      event: "call",
      agent: target.agentName,
      input,
      options,
    };

    try {
      await runMiddleware(callContext, middleware);
      const output = await target(input as any, options);
      const resultContext: MiddlewareContext = {
        kind: "agent",
        event: "result",
        agent: target.agentName,
        input,
        options,
        output,
      };
      await runMiddleware(resultContext, middleware);
      return output;
    } catch (error) {
      const errorContext: MiddlewareContext = {
        kind: "agent",
        event: "error",
        agent: target.agentName,
        input,
        options,
        error,
      };
      await runMiddleware(errorContext, middleware);
      throw error;
    }
  }) as AgentFn<I, O>;

  return Object.assign(wrapped, target);
}

function wrapEngine(target: Engine, middleware: Middleware[]): Engine {
  return {
    createSession(options: { model: string }): EngineSession {
      const session = target.createSession(options);
      return {
        async send(prompt: string, request: { signal?: AbortSignal }): Promise<string> {
          const sendContext: MiddlewareContext = {
            kind: "engine",
            event: "send",
            model: options.model,
            prompt,
            options: request,
          };

          try {
            await runMiddleware(sendContext, middleware);
            const response = await session.send(prompt, request);
            const resultContext: MiddlewareContext = {
              kind: "engine",
              event: "result",
              model: options.model,
              prompt,
              options: request,
              response,
            };
            await runMiddleware(resultContext, middleware);
            return response;
          } catch (error) {
            const errorContext: MiddlewareContext = {
              kind: "engine",
              event: "error",
              model: options.model,
              prompt,
              options: request,
              error,
            };
            await runMiddleware(errorContext, middleware);
            throw error;
          }
        },
      };
    },
  };
}

async function runMiddleware(context: MiddlewareContext, middleware: Middleware[]): Promise<void> {
  let index = -1;

  const dispatch = async (nextIndex: number): Promise<void> => {
    if (nextIndex <= index) {
      throw new Error("next() called multiple times");
    }
    index = nextIndex;
    const current = middleware[nextIndex];
    if (!current) {
      return;
    }
    await current(context, () => dispatch(nextIndex + 1));
  };

  await dispatch(0);
}
