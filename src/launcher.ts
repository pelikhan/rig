import { pathToFileURL } from "node:url";
import { runLauncherCli } from "./rig.ts";

export type { LaunchOptions, LauncherIo } from "./rig.ts";
export { launchRigProgram, runLauncherCli } from "./rig.ts";

const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) {
  runLauncherCli().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
