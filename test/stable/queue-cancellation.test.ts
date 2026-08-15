import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { Worker } from "node:worker_threads";
import { describe, expect, it } from "vitest";

import LibRaw from "../../lib/stable/index";

const raf = fileURLToPath(
  new URL("../../sample-images/DSCF4042.RAF", import.meta.url),
);
const nef = fileURLToPath(
  new URL("../fixtures/raw/nikon-d40.nef", import.meta.url),
);
const execFileAsync = promisify(execFile);

describe("per-instance queue and cancellation", () => {
  it("serializes dependent operations submitted without awaiting", async () => {
    const processor = new LibRaw();
    const opened = processor.openFile(raf);
    const unpacked = processor.unpack();
    await Promise.all([opened, unpacked]);

    expect(processor.state).toBe("unpacked");
    await processor.close();
  });

  it("cancels a queued job before native execution", async () => {
    const processor = new LibRaw();
    const controller = new AbortController();
    const loading = processor.loadFile(raf);
    const queued = processor.getImgData({ signal: controller.signal });
    controller.abort("queued cancellation");

    await loading;
    await expect(queued).rejects.toMatchObject({ code: "ABORT_ERR" });
    await processor.close();
  });

  it("cancels an active decode through the shared native flag", async () => {
    const processor = new LibRaw();
    const controller = new AbortController();
    const decoding = processor.loadFile(raf, { signal: controller.signal });
    setTimeout(() => controller.abort("active cancellation"), 2);

    await expect(decoding).rejects.toMatchObject({ code: "ABORT_ERR" });
    await processor.close();
  });

  it("lets close drain an already-running operation", async () => {
    const processor = new LibRaw();
    const loading = processor.loadFile(raf);
    const closing = processor.close();
    await expect(loading).resolves.toBeUndefined();
    await expect(closing).resolves.toBeUndefined();
    expect(processor.state).toBe("closed");
  });

  it("permanently rejects operations submitted after close is requested", async () => {
    const processor = new LibRaw();
    const loading = processor.loadFile(raf);
    const closing = processor.close();
    const late = loading.then(() => processor.getImgData());

    await expect(late).rejects.toMatchObject({ code: "INSTANCE_CLOSED" });
    await expect(closing).resolves.toBeUndefined();
    expect(processor.state).toBe("closed");
  });

  it("allows independent instances to decode concurrently", async () => {
    const one = new LibRaw();
    const two = new LibRaw();
    const oneWorker = (one as unknown as { worker: Worker }).worker;
    const twoWorker = (two as unknown as { worker: Worker }).worker;
    expect(oneWorker.threadId).not.toBe(twoWorker.threadId);
    await Promise.all([one.loadFile(raf), two.loadFile(raf)]);
    expect(one.state).toBe("unpacked");
    expect(two.state).toBe("unpacked");
    await Promise.all([one.close(), two.close()]);
  });

  it("keeps each composite native render atomic with respect to recycle", async () => {
    const processor = new LibRaw();
    await processor.loadFile(raf);
    const rendered = processor.createJPEGBuffer({ width: 64 });
    const recycled = processor.recycle();

    await expect(rendered).resolves.toMatchObject({ format: "jpeg" });
    await expect(recycled).resolves.toBeUndefined();
    expect(processor.state).toBe("idle");
    await processor.close();
  });

  it("decides whether to process at execution time after a queued reload", async () => {
    const processor = new LibRaw();
    await processor.loadFile(raf);
    await processor.createJPEGBuffer({ width: 32 });

    const reloaded = processor.loadFile(raf);
    const rendered = processor.createJPEGBuffer({ width: 32 });
    await expect(reloaded).resolves.toBeUndefined();
    await expect(rendered).resolves.toMatchObject({
      format: "jpeg",
      width: 32,
    });
    await processor.close();
  });

  it("keeps processRawThumbnail atomic with respect to recycle", async () => {
    const processor = new LibRaw();
    const thumbnail = processor.processRawThumbnail({
      filePath: raf,
      format: "jpeg",
      maxSize: 48,
    });
    const recycled = processor.recycle();

    await expect(thumbnail).resolves.toMatchObject({
      format: "jpeg",
      width: 48,
    });
    await expect(recycled).resolves.toBeUndefined();
    await processor.close();
  });

  it("reports unpacked state after an embedded processRawThumbnail result", async () => {
    const processor = new LibRaw();
    const thumbnail = await processor.processRawThumbnail({
      filePath: raf,
      format: "jpeg",
      maxSize: 48,
    });

    expect(thumbnail.source).toBe("embedded-thumbnail");
    expect(processor.state).toBe("unpacked");
    await processor.close();
  });

  it("tears down cleanly inside a consumer worker thread", async () => {
    const entry = fileURLToPath(new URL("../../dist/index.cjs", import.meta.url));
    const worker = new Worker(
      `
        const { parentPort, workerData } = require("node:worker_threads");
        const { LibRaw } = require(workerData.entry);
        (async () => {
          const processor = new LibRaw();
          await processor.loadFile(workerData.fixture);
          await processor.close();
          parentPort.postMessage("closed");
        })().catch((error) => { throw error; });
      `,
      { eval: true, workerData: { entry, fixture: raf } },
    );
    const message = await new Promise((resolve, reject) => {
      worker.once("message", resolve);
      worker.once("error", reject);
    });
    expect(message).toBe("closed");
    await new Promise<void>((resolve) => worker.once("exit", () => resolve()));
  });

  it("tears down a consumer worker while a decode is active", async () => {
    const entry = fileURLToPath(new URL("../../dist/index.cjs", import.meta.url));
    const worker = new Worker(
      `
        const { parentPort, workerData } = require("node:worker_threads");
        const { LibRaw } = require(workerData.entry);
        const processor = new LibRaw();
        const decoding = processor.loadFile(workerData.fixture);
        parentPort.postMessage("decoding");
        decoding.catch(() => undefined);
      `,
      { eval: true, workerData: { entry, fixture: raf } },
    );
    await new Promise<void>((resolve, reject) => {
      worker.once("message", () => resolve());
      worker.once("error", reject);
    });

    const exitCode = await worker.terminate();
    expect(exitCode).toBeGreaterThanOrEqual(0);
  });

  it("keeps an instance alive while queued native work survives forced GC", async () => {
    const entry = fileURLToPath(new URL("../../dist/index.cjs", import.meta.url));
    const program = `
      const { LibRaw } = require(process.env.LIGHTDRIFT_ENTRY);
      (async () => {
        let processor = new LibRaw();
        const reference = new WeakRef(processor);
        const loading = processor.loadFile(process.env.LIGHTDRIFT_FIXTURE);
        processor = null;
        for (let attempt = 0; attempt < 8; attempt++) global.gc();
        await loading;
        const retained = reference.deref();
        if (!retained) throw new Error("processor was collected during native work");
        await retained.close();
      })().catch((error) => {
        console.error(error);
        process.exitCode = 1;
      });
    `;

    await expect(
      execFileAsync(process.execPath, ["--expose-gc", "-e", program], {
        env: {
          ...process.env,
          LIGHTDRIFT_ENTRY: entry,
          LIGHTDRIFT_FIXTURE: nef,
        },
        timeout: 30_000,
      }),
    ).resolves.toMatchObject({ stderr: "" });
  }, 35_000);

  it("rejects operations and still closes after an unexpected worker exit", async () => {
    const processor = new LibRaw();
    const internalWorker = (
      processor as unknown as { worker: Worker }
    ).worker;
    await internalWorker.terminate();

    await expect(processor.openFile(raf)).rejects.toMatchObject({
      name: "LibRawError",
      operation: "openFile",
    });
    await expect(processor.close()).resolves.toBeUndefined();
    expect(processor.state).toBe("closed");
  });
});
