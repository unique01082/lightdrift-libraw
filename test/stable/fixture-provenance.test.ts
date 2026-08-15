import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const fixtures = new Map([
  ["../fixtures/raw/canon-eos-350d.cr2", "8cbb84e04d93b005fe082da9c954122a612b5281af00aa088d767850f343fd38"],
  ["../fixtures/raw/nikon-d40.nef", "44e88bc77b7a531b22647bcd07b9393c4568062e8f0906d3bbdecb42fbe29e03"],
  ["../fixtures/raw/sony-nex-3.arw", "eeaaa6f8c246021c90c0ee29f6624e05ee6175601c85f4699e642f63a66df57d"],
  ["../fixtures/raw/olympus-e-1.orf", "042286653fbae5b085bef4a4e626145385ea6e82e817f166b4904abcef64457c"],
  ["../fixtures/raw/google-pixel-3a.dng", "78c7bec867f3f739d43df6f027fad36ead73502d062570ce6ca14f59cdc4a0dd"],
  ["../../sample-images/DSCF4042.RAF", "2887212a48dfe5291fd88e73ea76a4edb53716c8f09131bc2af309dab6e83064"],
  ["../../sample-images/P1020180.RW2", "392db341d9eb4c03aaa5fb2c61b529fbf5edbaf4075f37ac83e6f385e2e69cdd"],
]);

describe("redistributable RAW fixture provenance", () => {
  for (const [relativePath, expectedHash] of fixtures) {
    it(`pins ${relativePath}`, async () => {
      const contents = await readFile(new URL(relativePath, import.meta.url));
      expect(createHash("sha256").update(contents).digest("hex")).toBe(
        expectedHash,
      );
    });
  }
});
