import { agent } from "rig";
import { sh } from "rig/sh";

const ciDiagnosis = agent({
  name: "ciDiagnosis",
  input: { log: "CI log text" },
  output: {
    failure: "Failure summary",
    likelyCause: "Likely cause",
    commandsToTry: ["command"],
  },
  instructions: `Diagnose the CI log. Prefer the first real failure over cascading errors.`,
});

console.log(await ciDiagnosis({
  log: sh.text("cat ci.log", { purpose: "read CI log" }),
}));
