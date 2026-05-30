import { agent, s } from "rig";
import { p } from "rig";
const bugReport = agent({
    name: "bugReport",
    input: s.object({
        failure: s.string,
        environment: s.string
    }),
    output: s.object({
        title: s.string,
        body: s.string,
        labels: s.array(s.string)
    }),
    instructions: `Draft a GitHub bug report from the failure details.`,
});
console.log(await bugReport({
    failure: p.text("npm test 2>&1 || true"),
    environment: p.text("node --version && npm --version && uname -a"),
}));
