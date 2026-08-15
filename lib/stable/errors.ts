import type { ProcessorState } from "./types";

export interface LibRawErrorOptions {
  code: string;
  operation: string;
  librawCode?: number | null;
  state: ProcessorState;
  cause?: unknown;
}

export class LibRawError extends Error {
  readonly code: string;
  readonly operation: string;
  readonly librawCode: number | null;
  readonly state: ProcessorState;
  override readonly cause: unknown;

  constructor(message: string, options: LibRawErrorOptions) {
    super(message, { cause: options.cause });
    this.name = "LibRawError";
    this.code = options.code;
    this.operation = options.operation;
    this.librawCode = options.librawCode ?? null;
    this.state = options.state;
    this.cause = options.cause;
  }
}

export function normalizeError(
  error: unknown,
  operation: string,
  state: ProcessorState,
): LibRawError {
  if (error instanceof LibRawError) return error;
  const candidate = error as {
    message?: string;
    code?: string;
    librawCode?: number;
    cause?: unknown;
  };
  return new LibRawError(candidate?.message ?? String(error), {
    code: candidate?.code ?? "LIBRAW_ERROR",
    operation,
    librawCode: candidate?.librawCode ?? null,
    state,
    cause: candidate?.cause ?? error,
  });
}
