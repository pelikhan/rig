import { agent, s, useEngine } from "rig";
import type { Engine } from "rig";

let calls = 0;
const flakyEngine: Engine = {
  createSession() {
    return {
      async send() {
        calls += 1;
        return calls === 1 ? "not json" : JSON.stringify({ summary: "Recovered after repair" });
      },
    };
  },
};

useEngine(flakyEngine);

const summarize = agent({
  name: "summarize",
  instructions: "Summarize the diff.",
  input: s.object({
    diff: s.string,
  }),
  output: s.object({
    summary: s.string,
  }),
  maxTurns: 2,
  repair: "default",
});

console.log(await summarize({ diff: "diff --git a/file.ts b/file.ts" }));
