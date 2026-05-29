import { agent, sh } from "rig";

const ShResult = {
  ok: true,
  stdout: "stdout",
  stderr: "stderr",
  exitCode: 0,
};

const diagnose = agent("diagnose", {
  input: { test: ShResult },
  output: {
    rootCause: "Likely root cause",
    confidence: 0.8,
    relevantFiles: ["src/example.ts"],
    nextSteps: ["Next debugging step"],
  },
  instructions: `
    Diagnose the failing test result.
    Do not edit files.
  `,
});

const result = await diagnose({
  test: sh.result("npm test"),
});

console.log(result);
