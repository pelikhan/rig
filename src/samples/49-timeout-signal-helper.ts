import { agent, useEngine } from "rig";

useEngine({
  async send(prompt, options) {
    console.log("model", options.model);
    console.log(prompt.slice(0, 200));
    return JSON.stringify({ text: "custom engine response" });
  },
});

const worker = agent("worker", {
  instructions: `Return a short response in output.text.`,
});

console.log(await worker({ text: "hello" }));
