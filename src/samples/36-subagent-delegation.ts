import { agent, s } from "rig";

const researcher = agent({
  name: "researcher",
  instructions: "Extract the most important implementation details from the topic.",
  input: s.object({
    topic: s.string,
  }),
  output: s.object({
    summary: s.string,
    risks: s.array(s.string),
  }),
});

const planner = agent({
  name: "planner",
  instructions: "Turn the research summary into concrete next steps for the caller.",
  input: s.object({
    summary: s.string,
    risks: s.array(s.string),
  }),
  output: s.object({
    decision: s.string,
    nextSteps: s.array(s.string),
  }),
});

const research = await researcher({
  topic: "Explain runtime-visible schemas in one paragraph.",
});

const plan = await planner(research);

console.log({ research, plan });
