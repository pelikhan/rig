import { agent, useEngine } from "rig";

useEngine({
  createSession(opts) {
    console.log("model", opts.model);
    return {
      async send(prompt: string) {
        console.log(prompt.slice(0, 200));
        return JSON.stringify({ text: "custom engine response" });
      },
    };
  },
});

const worker = agent({
  name: "worker",
  instructions: `Return a short response in output.text.`,
});

console.log(await worker({ text: "hello" }));
