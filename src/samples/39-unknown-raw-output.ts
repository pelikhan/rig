import { agent, s } from "rig";

const reviewRecord = agent({
  name: "reviewRecord",
  input: { finding: "finding text" },
  output: {
    kind: s.literal("review-finding"),
    finding: "finding text",
    severity: s.enum("info", "warning", "error"),
  },
  instructions: `Convert the finding into a typed review record.`,
});

console.log(await reviewRecord({ finding: "No regression test covers the parser repair path." }));
