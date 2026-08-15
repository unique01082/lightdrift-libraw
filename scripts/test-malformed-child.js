const { LibRaw, LibRawError } = require("../dist/index.cjs");

(async () => {
  const processor = new LibRaw();
  try {
    await processor.openBuffer(Buffer.from("malformed RAW input"));
    process.exitCode = 2;
  } catch (error) {
    if (!(error instanceof LibRawError)) process.exitCode = 3;
    try {
      await processor.setOutputParams({ output_bps: 7 });
      process.exitCode = 4;
    } catch (parameterError) {
      if (!(parameterError instanceof LibRawError)) process.exitCode = 5;
    }
  } finally {
    await processor.close();
  }
})();
