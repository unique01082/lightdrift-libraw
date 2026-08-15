import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import LibRaw from "../../lib/stable/index";

const fixtures = [
  ["Canon CR2", "../fixtures/raw/canon-eos-350d.cr2"],
  ["Nikon NEF", "../fixtures/raw/nikon-d40.nef"],
  ["Sony ARW", "../fixtures/raw/sony-nex-3.arw"],
  ["Olympus ORF", "../fixtures/raw/olympus-e-1.orf"],
  ["DNG", "../fixtures/raw/google-pixel-3a.dng"],
  ["Fujifilm RAF", "../../sample-images/DSCF4042.RAF"],
  ["Panasonic RW2", "../../sample-images/P1020180.RW2"],
] as const;

describe("RAW family fixture matrix", () => {
  it.each(fixtures)("opens, snapshots, thumbnails, and renders %s", async (_, relative) => {
    const file = fileURLToPath(new URL(relative, import.meta.url));
    const processor = new LibRaw();
    try {
      await processor.loadFile(file);
      const snapshot = await processor.getImgData();
      expect(snapshot.sizes.width).toBeGreaterThan(0);
      expect(snapshot.sizes.height).toBeGreaterThan(0);
      const thumbnail = await processor.createThumbnailJPEGBuffer({ width: 96 });
      expect(thumbnail.format).toBe("jpeg");
      expect(thumbnail.data.subarray(0, 2).toString("hex")).toBe("ffd8");
      expect(Math.max(thumbnail.width, thumbnail.height)).toBeLessThanOrEqual(96);
      const rendered = await processor.createJPEGBuffer({ width: 64, height: 64 });
      expect(rendered).toMatchObject({
        format: "jpeg",
        width: expect.any(Number),
        height: expect.any(Number),
        source: "processed",
      });
      expect(rendered.data.subarray(0, 2).toString("hex")).toBe("ffd8");
      expect(Math.max(rendered.width, rendered.height)).toBeLessThanOrEqual(64);
    } finally {
      await processor.close();
    }
  });
});
