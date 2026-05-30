import { agent, p, registerIntentRenderer, s } from "rig";
import type { RigEvent } from "rig";

// ─── Custom intent ────────────────────────────────────────────────────────────
//
// Analogous to pi-agent's CustomAgentMessages declaration merging.
// Third-party packages can extend the intent system without modifying rig core.

declare module "rig" {
  interface CustomIntents {
    http: HttpIntent;
  }
}

interface HttpIntent {
  __rig: "http";
  id: string;
  method: string;
  url: string;
}

function httpIntent(method: string, url: string): HttpIntent {
  return { __rig: "http", id: `http_${Date.now()}`, method, url };
}

// Register a renderer so rig knows how to inline this intent into the prompt.
registerIntentRenderer("http", (intent) => {
  const http = intent as HttpIntent;
  return `Fetch ${http.method} ${http.url} and return the response body`;
});

// ─── Agent with custom intent ─────────────────────────────────────────────────

const apiSummarizer = agent({
  name: "apiSummarizer",
  instructions: p`Summarize the response from ${httpIntent("GET", "https://api.example.com/status")}.`,
  output: s.object({ summary: s.string }),
});

// ─── Lifecycle subscription ───────────────────────────────────────────────────
//
// Analogous to pi-agent's Agent.subscribe().
// Observe lifecycle events without wrapping or modifying the agent.

const unsubscribe = apiSummarizer.subscribe((event: RigEvent) => {
  switch (event.type) {
    case "call":
      console.log(`[${event.agent}] call started`);
      break;
    case "send":
      console.log(`[${event.agent}] turn ${event.turn}: sending prompt (${event.prompt.length} chars)`);
      break;
    case "response":
      console.log(`[${event.agent}] turn ${event.turn}: received response`);
      break;
    case "result":
      console.log(`[${event.agent}] result:`, event.output);
      break;
    case "error":
      console.error(`[${event.agent}] error:`, event.error);
      break;
  }
});

// Unsubscribe when done (e.g. on cleanup).
void unsubscribe;
