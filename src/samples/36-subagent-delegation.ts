import { agent } from "rig";

const worker = agent({
  name: "worker",
  model: "gpt-4.1",
  timeout: 120_000,
  maxTurns: 4,
  instructions: `Answer input.text as concise JSON text output.`,
});

const controller = new AbortController();

const result = await worker(
  { text: "Explain runtime-visible schemas in one paragraph." },
  {
    model: "gpt-4.1",
    timeout: 30_000,
    maxTurns: 2,
    signal: controller.signal,
  },
);

console.log(result.text);
