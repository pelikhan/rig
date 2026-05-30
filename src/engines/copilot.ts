import { CopilotClient } from "@github/copilot-sdk";
import type { Engine, EngineSession } from "../rig.ts";

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
            session.on((event: unknown) => {
              console.log(jsonl({ source: "copilot-sdk", event }));
            });
          }
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
