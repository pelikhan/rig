import { agent, s, p } from "rig";

// Builds a package map for a JavaScript monorepo by parsing all package.json
// manifests, listing packages and their inter-package relationships.
const packageMap = agent({
    name: "packageMap",
    input: s.object({
        manifests: s.string
    }),
    output: s.object({
        packages: s.array(s.object({
            name: s.string,
            path: s.string,
            private: s.boolean
        })),
        relationships: s.array(s.object({
            from: s.string,
            to: s.string,
            kind: s.string
        }))
    }),
    instructions: `Build a package map for a JavaScript monorepo.`,
});

export default packageMap;
