import { agent, s, useEngine } from "rig";
import type { Engine } from "rig";

const customEngine: Engine = {
  createSession() {
    return {
      async send() {
        // Real engines would inspect the prompt and produce a dynamic response.
        return JSON.stringify({ summary: "ok", risk: "low" });
      },
    };
  },
};

useEngine(customEngine);

const review = agent({
  name: "review",
  input: s.object({ diff: s.string }),
  output: s.object({
    summary: s.string,
    risk: s.enum("low", "medium", "high"),
  }),
});

const result = await review({ diff: "..." });
console.log(result);

export default review;
