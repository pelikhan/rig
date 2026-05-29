import { agent } from "rig";

const classify = agent("classify", {
  input: { text: "issue description" },
  output: {
    text: "triage summary",
  },
  instructions: `Classify the issue text and summarize the reasoning in one sentence.`,
});

classify.use(async (ctx, next) => {
  if (ctx.phase === "beforeSend") {
    ctx.prompt += "\nAlways reply with strict JSON matching the schema.";
  }

  await next();

  if (ctx.phase === "afterParse" && ctx.parsed && typeof ctx.parsed === "object") {
    const text = "text" in ctx.parsed && typeof ctx.parsed.text === "string"
      ? ctx.parsed.text
      : "middleware summary";
    ctx.parsed = { ...ctx.parsed, text: `${text} [middleware]` };
  }
});

console.log(await classify({
  text: "CLI returns success even when upload fails with a network timeout.",
}));
