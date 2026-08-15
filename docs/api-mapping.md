# LibRaw API mapping

The machine-readable source of truth is
[`api/libraw-0.22.2.json`](../api/libraw-0.22.2.json). It records every public
LibRaw 0.22.2 operation, its camelCase JavaScript name and signature, and
whether it is supported or excluded.

The JavaScript mirror excludes only APIs whose pointer ownership cannot be
made safe: `open_datastream`, `get_internal_data_pointer`, `set_dng_host`,
`output_params_ptr`, and `dcraw_clear_mem`. Safe replacements use typed
snapshots, parameter accessors, and copied `Buffer` objects.

`set_rawspeed_camerafile` is also excluded because RawSpeed is disabled in the
v1 build profile; LibRaw otherwise compiles that operation as a success-returning
no-op.

Native callback registrations map to `progress`, `dataError`, `exifTag`, and
`makerNote` events. Static helpers such as version, capabilities, and camera
lists remain synchronous; operations touching processor state return promises.

`output_bps` accepts only LibRaw's safe `8` and `16` values. PPM output
preserves 16-bit samples in network byte order with a `65535` maximum value.
Sharp convenience codecs normalize 16-bit LibRaw samples to 8-bit before
encoding; use `dcrawMakeMemImage()` or `createPPMBuffer()` when the full 16-bit
sample precision is required.

## Related

- [Lifecycle](lifecycle.md) - State and error behavior.
- [Documentation index](README.md) - All v1 documentation.
