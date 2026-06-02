import { agent, s } from "rig";

const complexIntegration = agent({
  name: "complex-integration-sonnet",
  model: "claude-haiku-4.5",
  maxTurns: 2,
  input: s.object({
    topic: s.string,
    audience: s.optional(s.string),
  }),
  output: s.object({
    headline: s.string,
    checklist: s.array(s.string),
    riskLevel: s.enum("low", "medium", "high"),
    nextActions: s.array(s.object({
      owner: s.string,
      action: s.string,
    })),
    contextDigest: s.object({
      repository: s.string,
      usedFeatures: s.array(s.string),
    }),
  }),
  instructions: `
    Build a compact execution brief for the provided topic and audience.
    Keep the response concise and practical.
    Mention only the features used directly in this sample.
  `,
});

export default complexIntegration;
