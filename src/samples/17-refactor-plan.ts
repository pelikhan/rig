import { agent, sh } from "rig";

const docsGap = agent("docsGap", {
  input: {
    source: "source files",
    docs: "documentation text",
  },
  output: {
    missing: ["Missing doc topic"],
    stale: ["Stale doc topic"],
    quickFixes: ["Suggested documentation fix"],
  },
  instructions: `Find documentation gaps against the source API.`,
});

console.log(await docsGap({
  source: sh.text("grep -R \"export \" -n src || true"),
  docs: sh.text("cat README.md docs/*.md 2>/dev/null || true"),
}));
