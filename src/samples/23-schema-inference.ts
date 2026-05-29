import { agent, sh } from "rig";

const normalize = agent("normalizeConfig", {
  input: { config: "raw JSON or JS config" },
  output: {
    normalized: agent.unknown(),
    warnings: ["warning"],
  },
  instructions: `Normalize the config into a JSON-compatible object.`,
});

console.log(await normalize({
  config: sh.text("cat config.json 2>/dev/null || cat config.js"),
}));
