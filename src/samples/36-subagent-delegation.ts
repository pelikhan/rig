import { agent, s } from "rig";

// Extracts the most important implementation details from a given topic,
// returning a summary and a list of risks.
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

// Turns a research summary into concrete next steps for the caller, delivering
// a decision and an ordered action list.
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

export default researcher;
