import { agent } from "rig";
import { p } from "rig";

const snapshotReview = agent({
  name: "snapshotReview",
  input: {
    testResult: { ok: true, stdout: "", stderr: "", exitCode: 0 },
    diff: "snapshot diff",
  },
  output: {
    safeToUpdate: true,
    reason: "reason",
    command_: "npm test -- -u",
  },
  instructions: `Decide whether snapshot updates are legitimate.`,
});

console.log(await snapshotReview({
  testResult: p.result("npm test -- --runInBand"),
  diff: p.text("git diff -- '*snap*'"),
}));
