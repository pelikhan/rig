import { agent, sh } from "rig";

const releaseAgent = agent("releaseAgent", {
  input: {
    status: "git status",
    tests: { ok: true, stdout: "", stderr: "", exitCode: 0 },
    commits: "recent commits",
    packageJson: "package metadata",
  },
  output: {
    ready: true,
    versionBump: agent.enum(["none", "patch", "minor", "major"]),
    notes: "release notes markdown",
    blockers: ["blocker"],
  },
  instructions: `
    Decide whether the repository is ready for release.
    Use test result, working tree status, commits, and package metadata.
  `,
});

console.log(await releaseAgent({
  status: sh.text("git status --short"),
  tests: sh.result("npm test"),
  commits: sh.text("git log --oneline -30"),
  packageJson: sh.text("cat package.json"),
}));
