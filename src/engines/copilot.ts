import { CopilotClient, RuntimeConnection } from "@github/copilot-sdk";
import type { CopilotClientOptions } from "@github/copilot-sdk";
import type { Engine, EngineSession } from "../rig.ts";

export type CopilotEngineOptions = CopilotClientOptions & {
  logEvents?: boolean;
  logger?: (line: string) => void;
  onEvent?: (event: unknown) => void;
};

export function copilotEngine(options: CopilotEngineOptions = {}): Engine {
  const { logEvents = true, logger, onEvent, ...clientOptions } = options;
  const client = new CopilotClient({
    ...clientOptions,
    connection: clientOptions.connection ?? RuntimeConnection.forTcp(),
  });

  return {
    createSession(sessionOptions: { model: string }): EngineSession {
      let sessionPromise: Promise<any> | undefined;
      return {
        async send(prompt: string, request: { signal?: AbortSignal }): Promise<string> {
          sessionPromise ??= client.createSession({
            model: sessionOptions.model,
            streaming: false,
          }).then((session: any) => {
            session.on?.((event: unknown) => {
              onEvent?.(event);
              if (logEvents) {
                (logger ?? console.log)(jsonl({ source: "copilot-sdk", event }));
              }
            });
            return session;
          });

          const session = await sessionPromise;
          const response = await session.sendAndWait({ prompt, signal: request.signal } as any);
          if (!response) {
            return "";
          }
          if (typeof response === "string") {
            return response;
          }
          const value = response as any;
          return value?.data?.content ?? value?.data?.text ?? value?.text ?? value?.content ?? JSON.stringify(response);
        },
      };
    },
  };
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
