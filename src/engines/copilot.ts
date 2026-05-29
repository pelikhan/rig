import { CopilotClient } from "@github/copilot-sdk";
import type { Engine, EngineSession } from "../rig.js";

export function copilotEngine(): Engine {
  return {
    createSession(options: { model: string }): EngineSession {
      let session: any;
      return {
        async send(prompt: string, request: { signal?: AbortSignal }): Promise<string> {
          if (!session) {
            session = await new CopilotClient().createSession({
              model: options.model,
              streaming: false,
            });
          }
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
