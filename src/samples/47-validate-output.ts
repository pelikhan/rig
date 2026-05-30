import { p } from "rig";

const input = {
  diff: p.text("git diff -- ."),
  status: p.text("git status --short"),
};

console.log(JSON.stringify(input, null, 2));
