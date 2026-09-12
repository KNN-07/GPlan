import type { AiErrorCode } from '../contracts';

export class AiError extends Error {
  readonly name = 'AiError';
  constructor(readonly code: AiErrorCode, message: string, readonly status?: number) {
    super(message);
  }
}
