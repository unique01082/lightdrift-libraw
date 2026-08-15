import { createRequire } from "node:module";
import path from "node:path";

import { findPackageRoot } from "./native";

const localRequire = createRequire(path.join(findPackageRoot(), "package.json"));
const BetaLibRaw = localRequire(path.join(findPackageRoot(), "lib", "index.js")) as {
  new (): {
    close(): Promise<unknown>;
    [name: string]: unknown;
  };
};

const warningKey = Symbol.for("lightdrift-libraw.legacy-warning-emitted");
const warningState = globalThis as typeof globalThis & {
  [warningKey]?: boolean;
};

class LegacyLibRaw extends BetaLibRaw {
  constructor() {
    if (!warningState[warningKey]) {
      warningState[warningKey] = true;
      process.emitWarning(
        "lightdrift-libraw/legacy is deprecated and will be removed in v2; migrate to the stable root API.",
        { code: "LIGHTDRIFT_LIBRAW_LEGACY", type: "DeprecationWarning" },
      );
    }
    super();
  }
}

export { LegacyLibRaw };
export default LegacyLibRaw;
