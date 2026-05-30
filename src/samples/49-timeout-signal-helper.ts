import { agent } from "rig";

// A minimal agent that accepts any input and returns a short text response,
// demonstrating timeout and signal-handling patterns for long-running tasks.
const worker = agent({
  name: "worker",
  instructions: `Return a short response in output.text.`,
});

export default worker;
