import { agent, p, s } from "rig";

// Summarizes the release candidate changes from the diff and recent commits,
// producing highlights for the downstream version-chooser.
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

// Chooses the safest semantic version bump (patch/minor/major) from the change
// summary and explains the rationale.
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

// Drafts the release title, a merge checklist, and a list of risks for the
// chosen version bump, completing the end-to-end release pipeline.
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

export default analyzeChanges;
