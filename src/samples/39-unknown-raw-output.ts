import { agent } from "rig";

const reviewRecord = agent("reviewRecord", {
  input: { finding: "finding text" },
  output: {
    kind: agent.literal("review-finding"),
    finding: "finding text",
    severity: agent.enum(["info", "warning", "error"]),
  },
  instructions: `Convert the finding into a typed review record.`,
});

console.log(await reviewRecord({ finding: "No regression test covers the parser repair path." }));
