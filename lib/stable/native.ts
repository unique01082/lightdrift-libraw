import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import nodeGypBuild from "node-gyp-build";

export interface NativeWrapper {
  [name: string]: any;
}

export interface NativeWrapperConstructor {
  new (flags?: number): NativeWrapper;
  getVersion(): string;
  getCapabilities(): number;
  getCameraList(): string[];
  getCameraCount(): number;
  cameraMakerIndexToMaker(index: number): string | null;
  simplifyMakeModel(index: number, make: string, model: string): {
    makerIndex: number;
    make: string;
    model: string;
  };
  strProgress(progress: number): string;
}

export interface NativeAddon {
  LibRawWrapper: NativeWrapperConstructor;
}

function moduleDirectory(): string {
  return typeof __dirname === "string"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));
}

export function findPackageRoot(start = moduleDirectory()): string {
  let current = start;
  for (;;) {
    const manifest = path.join(current, "package.json");
    if (existsSync(manifest)) {
      try {
        const parsed = JSON.parse(readFileSync(manifest, "utf8")) as {
          name?: string;
        };
        if (parsed.name === "lightdrift-libraw") return current;
      } catch {
        // Keep walking; a parent package may own the bundled file.
      }
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  throw new Error("Cannot locate the lightdrift-libraw package root");
}

let cachedAddon: NativeAddon | undefined;

export function loadNativeAddon(): NativeAddon {
  cachedAddon ??= nodeGypBuild(findPackageRoot()) as NativeAddon;
  return cachedAddon;
}
