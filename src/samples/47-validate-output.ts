import { collectIntents, sh } from "rig";

const input = {
  diff: sh.text("git diff -- ."),
  status: sh.text("git status --short"),
};

const { value, intents } = collectIntents(input);

console.log(JSON.stringify({ value, intents }, null, 2));
