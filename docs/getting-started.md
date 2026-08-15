# Getting started

Install the RC from the `next` dist-tag:

```bash
npm install lightdrift-libraw@next
```

## ESM

```js
import { LibRaw } from "lightdrift-libraw";

const processor = new LibRaw({ flags: 0 });
try {
  await processor.openFile("photo.nef");
  const beforeDecode = await processor.getImgData();
  await processor.unpack();
  const pixels = await processor.getRawImageBuffer();
  console.log(beforeDecode.metadata, pixels.length);
} finally {
  await processor.close();
}
```

## CommonJS

```js
const { LibRaw } = require("lightdrift-libraw");

async function thumbnail(path) {
  const processor = new LibRaw();
  try {
    await processor.loadFile(path);
    return await processor.createThumbnailJPEGBuffer({ width: 320 });
  } finally {
    await processor.close();
  }
}
```

`openFile()` preserves upstream semantics and does not unpack. `loadFile()` is
the convenience sequence recycle → open → unpack. `openBuffer()` copies its
input into worker-owned memory and remains valid until recycle or close.

## Related

- [Lifecycle](lifecycle.md) - Queue and ownership rules.
- [Project README](../README.md) - Capability summary.
