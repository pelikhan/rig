import { CopilotClient, RuntimeConnection } from "@github/copilot-sdk";
import type { CopilotClientOptions } from "@github/copilot-sdk";
import type { Engine, EngineSession } from "../rig.ts";

export type CopilotEngineOptions = CopilotClientOptions;

export function copilotEngine(options: CopilotEngineOptions = {}): Engine {
  const client = new CopilotClient({
    ...options,
    connection: options.connection ?? RuntimeConnection.forTcp(),
  });

  return {
    createSession(sessionOptions: { model: string }): EngineSession {
      let sessionPromise: Promise<any> | undefined;
      return {
        async send(prompt: string, request: { signal?: AbortSignal }): Promise<string> {
          sessionPromise ??= client.createSession({
            model: sessionOptions.model,
            streaming: false,
          });
          const session = await sessionPromise;
          const response = await session.sendAndWait({ prompt, signal: request.signal } as any);
          if (typeof response === "string") {
            return response;
          }
          const value = response as any;
          return value?.text ?? value?.content ?? value?.data?.text ?? value?.data?.content ?? JSON.stringify(response);
        },
      };
    },
  };
}
