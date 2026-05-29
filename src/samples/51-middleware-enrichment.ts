import { agent } from "rig";

const classify = agent("classify", {
  input: { issueDescription: "issue description" },
  output: {
    triageSummary: "triage summary",
  },
  instructions: `Classify the issue text and summarize the reasoning in one sentence.`,
});

classify.use(async (ctx, next) => {
  if (ctx.phase === "beforeSend") {
    ctx.prompt += "\nAlways reply with strict JSON matching the schema.";
  }

  await next();

  if (ctx.phase === "afterParse" && ctx.parsed && typeof ctx.parsed === "object") {
    const triageSummary = "triageSummary" in ctx.parsed && typeof ctx.parsed.triageSummary === "string"
      ? ctx.parsed.triageSummary
      : "middleware summary";
    ctx.parsed = { ...ctx.parsed, triageSummary: `${triageSummary} [middleware]` };
  }
});

console.log(await classify({
  issueDescription: "CLI returns success even when upload fails with a network timeout.",
}));
