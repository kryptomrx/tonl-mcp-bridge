/**
 * Custom Error Classes for TONL
 * Provides clear, actionable error messages
 */

export class TonlError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'TonlError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class TonlParseError extends TonlError {
  constructor(message: string, details?: unknown) {
    super(message, 'PARSE_ERROR', details);
    this.name = 'TonlParseError';
  }
}

export class TonlValidationError extends TonlError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'TonlValidationError';
  }
}

export class TonlSchemaError extends TonlError {
  constructor(message: string, details?: unknown) {
    super(message, 'SCHEMA_ERROR', details);
    this.name = 'TonlSchemaError';
  }
}

export class TonlTypeError extends TonlError {
  constructor(message: string, details?: unknown) {
    super(message, 'TYPE_ERROR', details);
    this.name = 'TonlTypeError';
  }
}

/**
 * Helper to create detailed error messages
 */
export function createDetailedError(
  baseMessage: string,
  context: {
    input?: string;
    line?: number;
    column?: number;
    expected?: string;
    received?: string;
  }
): string {
  let message = baseMessage;

  if (context.line !== undefined) {
    message += ` at line ${context.line}`;
  }

  if (context.column !== undefined) {
    message += `, column ${context.column}`;
  }

  if (context.expected) {
    message += `\n  Expected: ${context.expected}`;
  }

  if (context.received) {
    message += `\n  Received: ${context.received}`;
  }

  if (context.input) {
    const preview = context.input.length > 50 ? context.input.slice(0, 50) + '...' : context.input;
    message += `\n  Input: ${preview}`;
  }

  return message;
}
