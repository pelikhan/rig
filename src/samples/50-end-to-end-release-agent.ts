import { agent } from "rig";

const slow = agent({
  name: "slow",
  timeout: 5_000,
  instructions: `Return a concise answer.`,
});

const controller = new AbortController();

setTimeout(() => controller.abort(), 1_000);

try {
  console.log(await slow({ text: "Do work" }, { signal: controller.signal }));
} catch (error) {
  console.error(error);
}
