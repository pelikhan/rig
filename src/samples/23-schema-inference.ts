import { agent, s } from "rig";
import { sh } from "rig/sh";

const normalize = agent({
  name: "normalizeConfig",
  input: { config: "raw JSON or JS config" },
  output: {
    normalized: s.unknown,
    warnings: ["warning"],
  },
  instructions: `Normalize the config into a JSON-compatible object.`,
});

console.log(await normalize({
  config: sh.text("cat config.json 2>/dev/null || cat config.js"),
}));
