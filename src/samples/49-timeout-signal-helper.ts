import { agent } from "rig";

const worker = agent({
  name: "worker",
  instructions: `Return a short response in output.text.`,
});

console.log(await worker({ text: "hello" }));

export default worker;
