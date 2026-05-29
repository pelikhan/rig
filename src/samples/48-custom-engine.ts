import { agent, s, useEngine, validate } from "rig";
import type { Engine } from "rig";

const customEngine: Engine = {
  createSession() {
    return {
      async send() {
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
console.log(validate(result, review.outputSchema));
