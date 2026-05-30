import { agent, s } from "rig";
import { p } from "rig";
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
console.log(await packageMap({
    manifests: p.text("find . -name package.json -maxdepth 4 -print -exec cat {} \\\;"),
}));
