import { agent, p, s } from "rig";
import type { RigEvent } from "rig";

// ─── Agent using prompt helpers ───────────────────────────────────────────────

const apiSummarizer = agent({
  name: "apiSummarizer",
  instructions: p`Summarize the response from ${p.result("curl -s https://api.example.com/status")}.`,
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

export default apiSummarizer;
