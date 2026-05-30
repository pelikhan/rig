import { p } from "rig";

const input = {
  diff: p.bash("git diff -- ."),
  status: p.bash("git status --short"),
};

console.log(JSON.stringify(input, null, 2));
