import { agent, p, s } from "rig";

const analyzeChanges = agent({
  name: "analyzeChanges",
  instructions: "Summarize the release candidate changes from the diff and recent commits.",
  input: s.object({
    diff: s.string,
    commits: s.string,
  }),
  output: s.object({
    summary: s.string,
    highlights: s.array(s.string),
  }),
});

const chooseVersion = agent({
  name: "chooseVersion",
  instructions: "Choose the safest semantic version bump for the summarized changes.",
  input: s.object({
    summary: s.string,
    highlights: s.array(s.string),
  }),
  output: s.object({
    bump: s.enum("patch", "minor", "major"),
    rationale: s.string,
  }),
});

const draftRelease = agent({
  name: "draftRelease",
  instructions: "Draft the release title, checklist, and risks for the chosen version bump.",
  input: s.object({
    bump: s.enum("patch", "minor", "major"),
    rationale: s.string,
    summary: s.string,
    highlights: s.array(s.string),
  }),
  output: s.object({
    title: s.string,
    checklist: s.array(s.string),
    risks: s.array(s.string),
  }),
});

const analysis = await analyzeChanges({
  diff: p.bash("git diff --stat -- ."),
  commits: p.bash("git log --oneline -20"),
});

const version = await chooseVersion(analysis);

const release = await draftRelease({
  ...analysis,
  ...version,
});

console.log({ analysis, version, release });

export default analyzeChanges;
