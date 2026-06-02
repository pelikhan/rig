import { agent, s } from "rig";

const complexIntegration = agent({
  name: "integration-haiku",
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
    }),
  }),
  instructions: `
    Build a compact execution brief for the provided topic and audience.
    Keep the response concise and practical.
    Return only fields requested in the output schema.
  `,
});

export default complexIntegration;
